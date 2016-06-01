# IMgui-windows
Front end, browser-based GUI for the IMa suite of evolutionary biology analysis tools. This repository contains code for the Windows version.

NOTE: The IMa2 executable included currently does not support XML output and IMburn/run control via the GUI. 

##Required Software
* node.js
* A web browser

To install node.js, download the installer for Windows from [nodejs downloads](https://nodejs.org/en/download/)

##Installation
Without git:
1. Download the zip archive from this page, and extract it into a directory. 
2. Open a new cmd.exe window (can be found by searching from start menu/searchbar)
3. Navigate to the IMgui directory with the following command:
  ```
  cd C:\path\to\IMgui\
  ```
4. Enter the following command:
  ```
  npm install
  ```

If git is installed on your machine, the first step can be replaced by right-clicking in the destination folder in Windows Explorer and selecting "git", then running the command:
```
git clone git://github.com/jaredgk/IMgui-windows
```
Then do steps 2-4 as described above. 

##Run
1. To start the node.js application, run the following command in a cmd.exe window in the run directory:
  
  ```
  node index.js
  ```
2. Open a web browser window, and type the following path in the address bar:
  
  ```
  localhost:3000
  ```

Note that closing this cmd.exe window or killing the node.js process will end all active IMa2 jobs started by the front end. However, closing the browser window will not affect any running jobs. 
##Features
The IMgui front end had three pages: the Job Manager, Output/Burntrend Analysis, and IMfig Generation.

###Job Manager
The job manager will allow users to provide input file paths, an output file tag, a run mode (MCMC or load-genealogy), and other command line parameters. The browser will verify that selected parameters are compatible, and an option is provided to verify that the input files provided are present on the local filesystem. (Note that it will not validate the contents of the files)

Once a job is started, it will be added to the drop-down list above the text output box on the bottom of the page. From here, users can select a job to view output tables that are being generated, and control the state of the job by stopping/restarting/deleting an active job. User defined control of the run via IMrun/IMburn files can also be controlled from this area. 

###Output/Burntrend Analysis
The analysis page provides an XML parser to view tables and histograms contained in the output XML files from a run. To view, select a file and click the __Analyze__ button. 

If the file provided is a table file, ([out-prefix].xml or [out-prefix].intervals.xml) the first table will be auto-generated and displayed, with the drop-down menu that appears containing all of the tables provided in the file. These tables can be saved with the __Save as .csv__ or __Save as .png__ buttons. An optional filename can be provided in the text box above the save buttons. 

If the file provided is a histogram file, ([out-prefix].histograms.xml) two drop-down menus will appear. The top one lists histogram sets provided in the file, the bottom will provide variables that can be graphed. Once __Make Graph__ is clicked, a graph will be generated. Below the graph is the __Code__ section, which can create a basic plotting script of the graphed variable in MATLAB, maplotlib, or R. A maximum line length can be provided if the script will be copied into an IDE with a line limit. Clicking the __Generate Code__ button will then generate code, which can either be copied into a new file or downloaded with the __Download Code__ button. (An filename prefix can be provided in the marked textbox)

###IMfig
The IMfig page is a GUI for the IMfig plotting script, which displays population size, migration rates, and split time parameters with confidence intervals. The only required field in the input file name, all other parameters are optional, mostly to control formatting and color of the output file. Clicking the __Submit__ button will pass the parameters to the IMfig executable included with the distribution. If the run is successful, a .jpg image of the resulting .eps file will display in the browser. From here, the image can be downloaded by right clicking and selecting __Save Image As...__. The image and the .eps file can also be accessed from the public/ folder in the IMgui directory. 


Additional information is available on the help page which can be accessed via the link menu on the left of the page. 
