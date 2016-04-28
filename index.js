/*global $, jQuery*/

var express = require('express');
var app = express();
var path = require('path');
var http = require('http').Server(app);
var bodyParser = require('body-parser');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var io = require('socket.io')(http);
var os = require('os');
var fs = require('fs');

var jobIdx = 0;
var jobList = [];
var IMA_PATH_UNIX = 'IMa/IMa2';
var IMA_PATH_WIN = 'IMa\\IMa2.exe';
var IMFIG_PATH_UNIX = 'scripts/IMfig';
var IMFIG_PATH_WIN = 'scripts\\IMfig.exe';
var PATHTEST_PATH_UNIX = 'scripts/testpath.sh';
var PATHTEST_PATH_WIN = 'scripts\\testpath.bat';
var PORT_NUMBER = 3000;


app.use(express.static(path.join(__dirname,'public')));
app.use(bodyParser.urlencoded({ extended: false }));

//Checks that no active job (state 0, 1, or 2) has the same prefix as the 
//submitted job. Return 0 if there's a duplicate, 1 if not
function checkUniqPrefix(pref) {
    for(var i = 0; i < jobList.length; i++) {
        if (jobList[i].status !== 3 && pref === jobList[i].prefix) { return 0; }
    }
    return 1;
}

//Returns the name of the job. If no name provided (length == 0), provide a default name (Job #(jobIdx)).
//If the job name is a duplicate, add job ID after for a unique name.
function getName(jobname) {
    if(jobname.length === 0) {
        return 'Job #'.concat(jobList.length + 1);
    }
    for(var i = 0; i < jobList.length; i++) {
        if(jobList[i].status !== 3 && jobname === jobList[i].name) {
            return jobname.concat(' (',jobList.length+1,')');
        }
    }
    return jobname;
}

//Return args for spawn command, contingent on operating system
function parseArgs(ex,num_process) {
    var exl = ex.trim().split(' ');
    var o = [];
    var argl = [];
    if(os.platform() === 'win32') {
        o.push('cmd.exe');
        argl.push('/C');
        argl.push(IMA_PATH_WIN);
    } else if(os.platform() === 'linux') {
        if(num_process == 1) {
            o.push(IMA_PATH_UNIX);
            console.log('single thread');
        } else {
            o.push('mpirun');
            argl.push('-np',num_process,IMA_PATH_UNIX);
        }
    }
    for(var i = 0; i < exl.length; i++) {
        argl.push(exl[i]);
    }
    o.push(argl);
    return o;
}

function parseFigArgs(args) {
    var o = [];
    if(os.platform() === 'linux') { o.push(IMFIG_PATH_UNIX); }
    else if(os.platform() === 'win32') { o.push(IMFIG_PATH_WIN); }
    var n = [];
    //n.push(IMFIG_PATH);
    console.log(args);
    for(var i = 0; i < args.length; i++) {
        n.push(args[i]);
    }
    o.push(n);
    return o;
}

function getValidateArgs(args) {
    var o = [];
    var l = [];
    if(os.platform() === 'win32') {
        o.push(PATHTEST_PATH_WIN);
    } else {
        o.push('sh');
        l.push(PATHTEST_PATH_UNIX);
    }
    for(var i = 0; i < args.length; i++) {
        var t = args[i];
        if(t.substring(0,2) === '-o' && os.platform() === 'win32') {
            var tt = t.replace('/','\\\\');
            t = tt;
        }
        l.push(t);
    }
    o.push(l);
    return o;
}

//Creates a job object from a request object body (req.body). 
function createJob(reqObj) {
    var tJob = {};
    tJob.name = getName(reqObj.name);
    tJob.id = jobList.length;
    tJob.prefix = reqObj.prefix;
    tJob.burn = reqObj.burn;
    tJob.run = reqObj.run;
    console.log(tJob.burn + ' ' + tJob.run);
    tJob.pipeout = '';
    tJob.errs = '';
    tJob.args = parseArgs(reqObj.cmd,reqObj.num_process);
    console.log(tJob.args);
    tJob.status = 0;
    tJob.pid = -1;
    return tJob;
}

//Sets jobIdx, pid, and spawns process
function startJob(job) {
    var id = job.id;
    jobIdx = id;
    if(job.burn == 1) {
        fs.writeFileSync(job.prefix+'.IMburn','y');
    }
    if(job.run == 1) {
        fs.writeFileSync(job.prefix+'.IMrun','y');
    }
    var e = spawn(job.args[0],job.args[1]);
    job.pid = e.pid;
    e.stdout.setEncoding('utf-8');
    //Store stdout in job object, send to browser if job is selected
    e.stdout.on('data',function(data) {
        job.pipeout += data;
        if(id == jobIdx) {
            io.emit('process_data',data);
        }
    });
    e.stderr.setEncoding('utf-8');
    //Handles signals for beginning/end of user-controlled burn/run modes
    e.stderr.on('data',function(data) {
        console.log(data);
    });
    //Sends signal to browser to disable/enable appropriate buttons
    e.on("close",function(code) {
        console.log('close '+code);
        var s = 'close '+code+', run complete';
        job.pipeout += s;
        if(id == jobIdx) {
            io.emit('process_data',s);
            if(code == -1) {
                var IMA_PATH;
                if(os.platform() === 'win32') { IMA_PATH = IMA_PATH_WIN; }
                else { IMA_PATH = IMA_PATH_UNIX; }
                io.emit('job_error',IMA_PATH);
            } else {
                io.emit('end_job');
            }
        }
        job.status = 2;
    });
    e.on("stop",function(code) {
        console.log('stop '+code);
        var s = 'stop '+code;
        job.pipeout += s;
        if(id == jobIdx) {
            io.emit('process_data',s);
        }
        job.status = 1;
    });
    e.on("error",function(err) {
        console.log('error '+err);
        if (id == jobIdx) {
            io.emit('process_data',err);
        }
        job.status = 1;
    });
}

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

app.post('/', function (req,res) {
    var sendf = 0;
	var p = req.body.post;
	console.log('p: ' + p);
    //Checks for unique prefix, if condition met job wil start and become acti
	if (p === 'run') {
        if(checkUniqPrefix(req.body.prefix) === 0) {
            var j = {
                fail: 1
            }
            res.json(j);
            sendf = 1;
        } else {
            var job = createJob(req.body);
            var j = { 
                id: job.id,
                name: job.name,
                fail: 0
            };
            res.json(j);
            sendf = 1;
            jobList.push(job);
            jobIdx = job.id;
            startJob(job);
        }
	} else if (p === 'runvalidate') {
        var nonexistlist = []
        sendf = 1
        var inname = req.body.infile;
        var paramf = req.body.paramf;
        var titag = req.body.titag;
        var mcftag = req.body.mcftag;
        var nestedf = req.body.nestedf;
        var arg_files = [inname,paramf,titag,mcftag,nestedf];
        var spawn_args = getValidateArgs(arg_files);
        var myProc = spawn(spawn_args[0],spawn_args[1], {
            shell: true
        });
        myProc.stdout.setEncoding('utf-8');
        myProc.stdout.on('data',function(data) {
            nonexistlist = data.replace('\n','').split(' ');
        });
        myProc.on('close', function(data) {
            console.log(nonexistlist);
            sendJson = {
                infile: nonexistlist[0],
                paramf: nonexistlist[1],
                titag: nonexistlist[2],
                mcftag: nonexistlist[3],
                nestedf: nonexistlist[4]
            }
            res.json(sendJson);
        });
    } else if (p === 'change') {
        if (jobList.length === 0) {
            var j = {
                done: -1,
                stat: 'none'
            }
        } else {
            var id = req.body.id;
            jobIdx = id;
            console.log(jobIdx);
            io.emit('process_data',jobList[jobIdx].pipeout);
            var j = {
                done: jobList[id].status,
                burn: (jobList[id].burn == 1) ? 1 : 0,
                run: (jobList[id].run == 1) ? 1 : 0
            };
        }
        res.json(j);
        sendf = 1;
    } else if (p === 'getLabels') {
        j = {
            list: []
        };
        for(var i = 0; i < jobList.length; i++) {
            if (jobList[i].status !== 3) {
                var t = { name: jobList[i].name, id: jobList[i].id };
                j.list.push(t);
            }
        }
        res.json(j);
        sendf = 1;
    } else if (p === 'kill') {
        var id = req.body.id;
        var cmd = 'kill -9 '.concat(jobList[id].pid);
        var e = exec(cmd);
        jobList[id].pid = -1;
        jobList[id].status = 1; 
    }
    else if (p === 'delfile') {
        var id = req.body.id;
        var filename;
        if (jobList[id].stat === 'burn') { filename = 'IMburn.txt'; }
        else if(jobList[id].stat === 'run') { filename = 'IMrun.txt'; }
        var cmd = 'rm '+filename;
        var e = exec(cmd);
        var id = req.body.id;
    }
    else if (p === 'remove') {
        var id = req.body.id;
        if(jobList[id].status !== 0) {
            jobList[id].status = 3;
        }
    }
    else if (p === 'imfile') {
        var id = req.body.id;
        var cmd = 'kill -2 '.concat(jobList[id].pid);
        console.log(cmd);
        if(jobList[id].status === 0 && jobList[id].pid !== -1) {
            console.log('executing');
            var e = exec(cmd);
        }
    }
    else if (p === 'restart') {
        var id = req.body.id;
        var job = jobList[id];
        job.pipeout = '';
        job.errs = '';
        job.status = 0;
        startJob(jobList[id]);
        sendf = 1;
        if(job.burn == 2) { job.burn = 1; }
        if(job.run == 2) { job.run = 1; }
        var j = {
            burn: (jobList[id].burn == 1) ? 1 : 0,
            run: (jobList[id].run == 1) ? 1 : 0
        }
        res.send(j);
    } else if (p === 'refresh') {
        var id = req.body.id;
        var j = {
            data: jobList[id].pipeout
        }
        res.send(j);
        sendf = 1;
    } else if (p === 'imfig') {
        var s_args = parseFigArgs(JSON.parse(req.body.args));
        sendf = 1;
        console.log(s_args);
        var s = spawn(s_args[0],s_args[1]);
        var response_sent = 0;
        s.on('close',function () {
            var j = {
                fail: 0
            };
            if(response_sent === 0) {
                response_sent = 1;
                res.send(j);
            }
        });
        s.on('error',function (err) {
            console.log(JSON.stringify(err));
            var j = {
                fail: 1,
                msg: err
            };
            if(response_sent === 0) {
                response_sent = 1;
                res.send(j);
            }
        });     
    } else if (p === 'delburn') {
        var id = req.body.id;
        var job = jobList[id];
        fs.unlink(job.prefix+'.IMburn', function (err) {
            if(!err) {
                job.burn = 2;
                io.emit('burn-signal');
                    
            }
        });
    } else if (p === 'delrun') {
        var id = req.body.id;
        var job = jobList[id];
        fs.unlink(job.prefix+'.IMrun', function (err) {
            if(!err) {
                job.run = 2;
                io.emit('run-signal');
            }
        });
    }
    if(sendf === 0) {
	   res.sendStatus(200);
    }
});


http.listen(PORT_NUMBER,function(){
    console.log('IMa2 front end initiated, go to localhost:'+PORT_NUMBER+' in a web browser to use');
});


