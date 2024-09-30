/**
 * onOpen function runs when the spreadsheet is opened
 * It adds a DataWorks menu to the top bar of Google Sheets
 */
function onOpen() {
  console.log("Reached onOpen");
  SpreadsheetApp.getUi().createMenu('Datum Fieldnotes').addItem('Open Data Tool', 'showSidebar').addToUi();
  var log = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Log');
  /**
   * Prevents Editing the Log
   */
  var protection = log.protect();
  //protection.removeEditor(Session.getActiveUser());
  //protection.removeEditors(protection.getEditors());
  if (protection.canDomainEdit()) {
    protection.setDomainEdit(false);
  }
}

/**Function for viewing settings (opens settings dialog)
 * Loads HTML for the settings dialog
 * Displays the settings dialog
 * Log to indicate the form submission (for testing purposes)
  */
function viewSettings(){
  var widget = HtmlService.createHtmlOutputFromFile("settingsDialog.html");
  SpreadsheetApp.getUi().showModalDialog(widget, "Settings");
  console.log("form recieved");
}

/** Get user preference (from PropertiesService) 
 * called from settings Dialog page and stores users preference in properties 
**/
function saveUserPreference(form) {
  const logChoice = form.logChoice;

  let userName = null;
  let userEmail = null;
  // Extract userName only if logChoice is 'name'
  if(logChoice === "name"){
    userName = form.userName;
    userEmail = form.userEmail;
  }
  PropertiesService.getScriptProperties().setProperties({
    logPreference: logChoice,
    userName: userName, // Save userName only if applicable
    userEmail: userEmail
  });
}


/**
 * This function logs the users that have worked on the sheet to the Datasheet for Dataset Page
 * called by onEdit, writeNote , and showSidebar function 
 */
function logUniqueUsers(){
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = spreadsheet.getSheetByName('Log');
  const datasheet = spreadsheet.getSheetByName('Datasheet for Dataset Use and Distribution'); 

  if (logSheet.getLastRow() > 1) {
    const logData = logSheet.getRange(2, 1, logSheet.getLastRow() - 1, logSheet.getLastColumn()).getValues(); // Get all columns

    const uniqueUsers = new Set();

    logData.forEach(row => {
      const userEntry = row[6]; // Get the user entry (email or name and email)

      if (typeof userEntry === 'string') {
        let userIdentifier;
        if (userEntry.includes("(") && userEntry.includes(")")) {
          // Extract the entire entry if name and email are present
          userIdentifier = userEntry.substring(0, userEntry.indexOf(")")) + ")"; 
        } else {
          // Otherwise, use the entry as is (assuming it's just the email)
          userIdentifier = userEntry;
        }
        uniqueUsers.add(userIdentifier);
      } else {
        console.warn("Unexpected value in userEntry:", userEntry);
      }
    });

    const userList = Array.from(uniqueUsers);
    datasheet.getRange('B17').setValue(userList.join(", "));
  }
}

/** function that sets the color into properties
 * Logs the recieved color and its type for debugging
 * throws an error if the color is not a string
 * saves the color in script properties
 * 
*/
function setColor(color){
  console.log("Received color:", color, "Type:", typeof color); // Log the color and its type

  if (typeof color !== "string") {
    throw new Error("Invalid argument: color must be a string."); // Throw an error if not a string
  }
  PropertiesService.getScriptProperties().setProperty("colorSet", color);
}

/**
 * Displays notes associated with the currently selected cell in a modal dialog.
 * Retrieves notes from the 'Log' sheet based on cell and sheet name.
 */
function viewNotes(){
  loadCell();
  sheet = SpreadsheetApp.getActiveSheet();
  cell = sheet.getCurrentCell();
  sheet = sheet.getName();
  console.log("Reached viewNote");
  var ui = SpreadsheetApp.getUi();
  var log = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Log');
  var data = log.getDataRange().getValues()
  var id = cell.getA1Notation();
  console.log("id: " + id)
  var noteList = '';
  for (row in data) {
    if (data[row][1] == id && data[row][2] == sheet) {
      var note = data[row][9]
      if (note != "") {
        console.log(row)
        noteList = noteList + note + "\n";
      }
    }
  }
  console.log("list" + noteList)
  
  var htmlOutput = HtmlService.createHtmlOutput(
    '<textarea style="height:200px;width:250px;font-size:10pt;" type="text" id="notes" name="notes" TextMode="MultiLine"></textarea>').setWidth(300).setHeight(300).setContent(noteList.replace(/\n/g, "<br><br/>"))
    ui.showModalDialog(htmlOutput, "Notes")
}

/**
 * Main function for writing notes; called from page.html in noteDisplay when a 
 * change specific note is created, and from the addGeneralNote function in this file for a general note.
 */

function writeNote(row, note){
  console.log("reached write note");
  var log = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Log');
  log.getLastRow();
  var time = new Date();
  var user = Session.getActiveUser().getEmail(); // Get the user's email

  const logPreference = PropertiesService.getScriptProperties().getProperty("logPreference");
  if (logPreference === "name") {
    const userName = PropertiesService.getScriptProperties().getProperty("userName");
    const userEmail = PropertiesService.getScriptProperties().getProperty("userEmail");
    user = `${userName} (${userEmail})`; 
  }

  color = PropertiesService.getScriptProperties().getProperty("colorSet") || "yellow";
  console.log("color: " + color);

  var noteEntry = time + "\n" + note + "\n - " + user;
  console.log()
  console.log(noteEntry);
  if (log.getRange(row, 9).getDisplayValue() != "") {
    log.getRange(row, 9).setValue(log.getRange(row, 9).getValue() + "\n" + noteEntry)
  } else {
    log.getRange(row, 9).setValue(log.getRange(row, 9).getValue() + noteEntry)
  }
  logUniqueUsers();
  var ss = SpreadsheetApp.getActiveSheet()
  var cell = ss.getCurrentCell();
  cell.setBorder(true, true, true, true, false, false, color, SpreadsheetApp.BorderStyle.SOLID_THICK); 
}

/**
 * Script side function for general notes. Will create a new log entry with a change
 */

function addGeneralNote(note){
  console.log("adding general note");
  color = PropertiesService.getScriptProperties().getProperty("colorSet");
  console.log("color: " + color);
  var log = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Log');
  sheet = SpreadsheetApp.getActiveSheet();
  cell = sheet.getCurrentCell().getA1Notation();
  var user = Session.getActiveUser().getEmail().toString();
  const logPreference = PropertiesService.getScriptProperties().getProperty("logPreference");
  if (logPreference === "name") {
    const userName = PropertiesService.getScriptProperties().getProperty("userName");
    const userEmail = PropertiesService.getScriptProperties().getProperty("userEmail");
    user = `${userName} (${userEmail})`; 
  }
  var timestamp = new Date();
  if(sheet != 'Log' && sheet != "Datasheet for Dataset Use and Distribution") {
    log.appendRow([timestamp, cell, sheet.getName(), "", "", "", user, color]);
  }
  var rowNum = log.getLastRow();
  writeNote(rowNum, note);
}


/**
 * showSidebar function runs when the Open Data Tool button is selected from the DataWorks Menu
 * It checks if there is already a Log sheet, if not it creates one with the correct headings
 * It also creates a filter for the Log columns
 * It then sets the initial global variable values, which are stored as properties
 * Properties can only store strings, so objects are converted to JSON strings first
 * It generates the content for the sidebar by creating an HTMLOutput from the Page HTML file
 * Also generates the Datasheets questions as a new sheet
 */
function showSidebar() {
  console.log("Reached showSidebar");
  
  PropertiesService.getScriptProperties().setProperty("user", Session.getActiveUser().getEmail().toString())
  const logPreference = PropertiesService.getScriptProperties().getProperty("logPreference");
  if (logPreference === "name") {
    const userName = PropertiesService.getScriptProperties().getProperty("userName");
    const userEmail = PropertiesService.getScriptProperties().getProperty("userEmail");
    user = `${userName} (${userEmail})`; 
  }
  var log = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Log');
  if (log == null) {
    log = SpreadsheetApp.getActiveSpreadsheet().insertSheet(SpreadsheetApp.getActiveSpreadsheet().getNumSheets());
    log.setName('Log');
  }
  createDatasheet();
  if (log.getLastRow() == 0) {
    log.appendRow(["Timestamp", "Cell", "Sheet", "Previous Value", "New Value", "Formula", "User", "Color", "Notes"]);
    log.setColumnWidth(1, 150.0);
    log.setColumnWidth(7, 200.0);
    log.setColumnWidth(9, 400.0);
    const notesRange = log.getRange(1, 9, log.getLastRow(), 1); // Range for notes column (column 8)
    notesRange.setWrap(true); 
  
    var row = log.getDataRange();
    row.setHorizontalAlignment('left');
    row.setBorder(false,false,true,false,false,false);
  }
  
  if(log.getFilter() == null) {
    createFilter();
  }
  var sheet = SpreadsheetApp.getActiveSheet();
  const properties = PropertiesService.getScriptProperties();
  let history = JSON.parse(properties.getProperty('history') || '{}');
  properties.setProperties({
    'history': JSON.stringify(history),
    'cellChanged': false
    });
  var html = HtmlService.createHtmlOutputFromFile('Page').setTitle('Datum Fieldnotes');
  SpreadsheetApp.getUi().showSidebar(html);
  logUniqueUsers();
}

// Function to create the 'Datasheet' with predefined questions and formatting
function createDatasheet(){
  let datasheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Datasheet for Dataset Use and Distribution');
  if (datasheet == null) {
    datasheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(SpreadsheetApp.getActiveSpreadsheet().getNumSheets());
    datasheet.setName('Datasheet for Dataset Use and Distribution');
  }

  const headerFont = SpreadsheetApp.newTextStyle().setFontFamily("Arial").setFontSize(12).setBold(true).build();

  const sectionHeaderFont = SpreadsheetApp.newTextStyle().setFontFamily("Arial").setFontSize(11).setBold(true).build();

  const sectionsetFont = SpreadsheetApp.newTextStyle().setFontFamily("Arial").setFontSize(10).build();

  const tocFont = SpreadsheetApp.newTextStyle().setFontFamily("Arial").setFontSize(11).setItalic(true).build();

  const questionItalics = SpreadsheetApp.newTextStyle().setItalic(true).build();

  if(datasheet.getLastRow() == 0){
    datasheet.getRange(1, 1).setValue("Datasheet for Dataset Use and Distribution").setTextStyle(headerFont);

    datasheet.setColumnWidth(1, 474); // Column A
    datasheet.setColumnWidth(2, 638); // Column B

    datasheet.getRange("A:A").setWrap(true);
    datasheet.getRange("B:B").setWrap(true);
    
    const questionSets = [
      {
        title: "Questions for Data Workers",
        sections: [
          {title: "Basic Information", questions: [
            ["When was this dataset created?"],
            ["Who has worked on this dataset?"],
            ["Who should you contact if you have questions about this dataset?"],
            ["Is there a data use contract or agreement that someone accessing this dataset must consent to? Where can potential dataset users access that contract?"]
          ], backgroundColor: "#dde9d5"},
          {title: "Data Worker Reflections", questions: [
            ["Are there any ways you feel this dataset should not be used?"],
            ["Did you notice any interesting patterns or surprising entries in this dataset?"],
            ["Did you encounter difficulty working on this dataset? What kinds?"]
          ], backgroundColor: "#d5dfe2"},
        ]
      },
      {
        title: "Datasheets for Datasets Questions",
        sections: [
          {title: "Motivation", questions: [
            ["For what purpose was the dataset created? Was there a specific task in mind? Was there a specific gap that needed to be filled? Please provide a description."],
            ["Who created the dataset (e.g., which team, research group) and on behalf of which entity (e.g., company, institution, organization)?"],
            ["Who funded the creation of the dataset? If there is an associated grant, please provide the name of the grantor and the grant name and number."],
            ["Any other comments?"]
          ], backgroundColor: "#cfd9f5"},
          {title: "Composition", questions: [
            ["What do the instances that comprise the dataset represent (e.g., documents, photos, people, countries)? Are there multiple types of instances (e.g., movies, users, and ratings; people and interactions between them; nodes and edges)? Please provide a description."],
            ["How many instances are there in total (of each type, if appropriate)?"],
            ["Does the dataset contain all possible instances or is it a sample (not necessarily random) of instances from a larger set? If the dataset is a sample, then what is the larger set? Is the sample representative of the larger set (e.g., geographic coverage)? If so, please describe how this representativeness was validated/verified. If it is not representative of the larger set, please describe why not (e.g., to cover a more diverse range of instances, because instances were withheld or unavailable)."],
            ["What data does each instance consist of? “Raw” data (e.g., unprocessed text or images) or features? In either case, please provide a description."],
            ["Is there a label or target associated with each instance? If so, please provide a description."],
            ["Is any information missing from individual instances? If so, please provide a description, explaining why this information is missing (e.g., because it was unavailable). This does not include intentionally removed information, but might include, e.g., redacted text."],
            ["Are relationships between individual instances made explicit (e.g., users’ movie ratings, social network links)? If so, please describe how these relationships are made explicit."],
            ["Are there recommended data splits (e.g., training, development/validation, testing)? If so, please provide a description of these splits, explaining the rationale behind them."],
            ["Are there any errors, sources of noise, or redundancies in the dataset? If so, please provide a description."],
            ["Is the dataset self-contained, or does it link to or otherwise rely on external resources (e.g., websites, tweets, other datasets)? If it links to or relies on external resources, a) are there guarantees that they will exist, and remain constant, over time; b) are there official archival versions of the complete dataset (i.e., including the external resources as they existed at the time the dataset was created); c) are there any restrictions (e.g., licenses, fees) associated with any of the external resources that might apply to a dataset consumer? Please provide descriptions of all external resources and any restrictions associated with them, as well as links or other access points, as appropriate."],
            ["Does the dataset contain data that might be considered confidential (e.g., data that is protected by legal privilege or by doctor–patient confidentiality, data that includes the content of individuals’ non-public communications)? If so, please provide a description."],
            ["Does the dataset contain data that, if viewed directly, might be offensive, insulting, threatening, or might otherwise cause anxiety? If so, please describe why."],
            ["For datasets relating to people"],["Does the dataset identify any subpopulations (e.g., by age, gender)? If so, please describe how these subpopulations are identified and provide a description of their respective distributions within the dataset."],
            ["Is it possible to identify individuals (i.e., one or more natural persons), either directly or indirectly (i.e., in combination with other data) from the dataset? If so, please describe how."],
            ["Does the dataset contain data that might be considered sensitive in any way (e.g., data that reveals race or ethnic origins, sexual orientations, religious beliefs, political opinions or union memberships, or locations; financial or health data; biometric or genetic data; forms of government identification, such as social security numbers; criminal history)? If so, please provide a description."],
            ["Any other comments?"]
          ], backgroundColor: "#d5e1f1"},
          {title: "Collection Process", questions: [
            ["How was the data associated with each instance acquired? Was the data directly observable (e.g., raw text, movie ratings), reported by subjects (e.g., survey responses), or indirectly inferred/derived from other data (e.g., part-of-speech tags, model-based guesses for age or language)? If the data was reported by subjects or indirectly inferred/derived from other data, was the data validated/verified? If so, please describe how."],
            ["What mechanisms or procedures were used to collect the data (e.g., hardware apparatuses or sensors, manual human curation, software programs, software APIs)? How were these mechanisms or procedures validated?"],
            ["If the dataset is a sample from a larger set, what was the sampling strategy (e.g., deterministic, probabilistic with specific sampling probabilities)?"],
            ["Who was involved in the data collection process (e.g., students, crowdworkers, contractors) and how were they compensated (e.g., how much were crowdworkers paid)?"],
            ["Over what timeframe was the data collected? Does this timeframe match the creation timeframe of the data associated with the instances (e.g., recent crawl of old news articles)? If not, please describe the timeframe in which the data associated with the instances was created."],
            ["Were any ethical review processes conducted (e.g., by an institutional review board)? If so, please provide a description of these review processes, including the outcomes, as well as a link or other access point to any supporting documentation."],
            ["For datasets relating to people:"], ["Did you collect the data from the individuals in question directly, or obtain it via third parties or other sources (e.g., websites)?"],
            ["Were the individuals in question notified about the data collection? If so, please describe (or show with screenshots or other information) how notice was provided, and provide a link or other access point to, or otherwise reproduce, the exact language of the notification itself."],
            ["Did the individuals in question consent to the collection and use of their data? If so, please describe (or show with screenshots or other information) how consent was requested and provided, and provide a link or other access point to, or otherwise reproduce, the exact language to which the individuals consented."],
            ["If consent was obtained, were the consenting individuals provided with a mechanism to revoke their consent in the future or for certain uses? If so, please provide a description, as well as a link or other access point to the mechanism (if appropriate)."],
            ["Has an analysis of the potential impact of the dataset and its use on data subjects (e.g., a data protection impact analysis) been conducted? If so, please provide a description of this analysis, including the outcomes, as well as a link or other access point to any supporting documentation."],
            ["Any other comments?"]
          ], backgroundColor: "#d8d2e7"},
          {title: "Preprocessing", questions: [
            ["Was any preprocessing/cleaning/labeling of the data done (e.g., discretization or bucketing, tokenization, part-of-speech tagging, SIFT feature extraction, removal of instances, processing of missing values)? If so, please provide a description. If not, you may skip the remaining questions in this section."],
            ["Was the “raw” data saved in addition to the preprocessed/cleaned/labeled data (e.g., to support unanticipated future uses)? If so, please provide a link or other access point to the “raw” data."],
            ["Is the software that was used to preprocess/clean/label the data available? If so, please provide a link or other access point."],
            ["Any other comments?"]
          ], backgroundColor: "#e4d2db"},
          {title: "Uses", questions: [
            ["Has the dataset been used for any tasks already? If so, please provide a description."],
            ["Is there a repository that links to any or all papers or systems that use the dataset? If so, please provide a link or other access point."],
            ["What (other) tasks could the dataset be used for?"],
            ["Is there anything about the composition of the dataset or the way it was collected and preprocessed/cleaned/labeled that might impact future uses? For example, is there anything that a dataset consumer might need to know to avoid uses that could result in unfair treatment of individuals or groups (e.g., stereotyping, quality of service issues) or other risks or harms (e.g., legal risks, financial harms)? If so, please provide a description. Is there anything a dataset consumer could do to mitigate these risks or harms?"],
            ["Are there tasks for which the dataset should not be used? If so, please provide a description."],
            ["Any other comments?"]
          ], backgroundColor: "#dabab1"},
          {title: "Distribution", questions: [
            ["Will the dataset be distributed to third parties outside of the entity (e.g., company, institution, organization) on behalf of which the dataset was created? If so, please provide a description."],
            ["How will the dataset be distributed (e.g., tarball on website, API, GitHub)? Does the dataset have a digital object identifier (DOI)?"],
            ["When will the dataset be distributed?"],
            ["Will the dataset be distributed under a copyright or other intellectual property (IP) license, and/or under applicable terms of use (ToU)? If so, please describe this license and/or ToU, and provide a link or other access point to, or otherwise reproduce, any relevant licensing terms or ToU, as well as any fees associated with these restrictions."],
            ["Have any third parties imposed IP-based or other restrictions on the data associated with the instances? If so, please describe these restrictions, and provide a link or other access point to, or otherwise reproduce, any relevant licensing terms, as well as any fees associated with these restrictions."],
            ["Do any export controls or other regulatory restrictions apply to the dataset or to individual instances? If so, please describe these restrictions, and provide a link or other access point to, or otherwise reproduce, any supporting documentation."],
            ["Any other comments?"]
          ], backgroundColor: "#eacecd"},
          {title: "Maintenance", questions: [
            ["Who will be supporting/hosting/maintaining the dataset?"],
            ["How can the owner/curator/manager of the dataset be contacted (e.g., email address)?"],
            ["Is there an erratum? If so, please provide a link or other access point."],
            ["Will the dataset be updated (e.g., to correct labeling errors, add new instances, delete instances)? If so, please describe how often, by whom, and how updates will be communicated to dataset consumers (e.g., mailing list, GitHub)?"],
            ["If the dataset relates to people, are there applicable limits on the retention of the data associated with the instances (e.g., were the individuals in question told that their data would be retained for a fixed period of time and then deleted)? If so, please describe these limits and explain how they will be enforced."],
            ["Will older versions of the dataset continue to be supported/hosted/maintained? If so, please describe how. If not, please describe how its obsolescence will be communicated to dataset consumers."],
            ["If others want to extend/augment/build on/contribute to the dataset, is there a mechanism for them to do so? If so, please provide a description. Will these contributions be validated/verified? If so, please describe how. If not, why not? Is there a process for communicating/distributing these contributions to dataset consumers? If so, please provide a description."],
            ["Any other comments?"]
          ], backgroundColor: "#f5e6d0"},
        ]
      }
    ];

    let tocRow = 3;
    datasheet.getRange(tocRow, 1, 1, 2).merge().setValue("Table of contents").setBorder(false, false, true, false, false, false, "black", SpreadsheetApp.BorderStyle.SOLID).setTextStyle(tocFont);

    let tocAValues = [
        ["1 - For Data Workers"],
        ["Basic information"],
        ["Data worker reflections"]
    ];
    datasheet.getRange(tocRow+1, 1, tocAValues.length, 1).setValues(tocAValues);

    const tocBValues = [
        ["2 - Datasheets for Datasets questions"],
        ["Motivation"],
        ["Composition"],
        ["Collection process"],
        ["Preprocessing/cleaning/labeling"],
        ["Uses"],
        ["Distribution"],
        ["Maintenance"]
    ];
    datasheet.getRange(tocRow + 1, 2, tocBValues.length, 1).setValues(tocBValues); // Adjust starting row for tocBValues
    tocRow += tocBValues.length;

    let questionRow = tocRow + 2;
    questionSets.forEach(set =>{
      questionRow++;
      
      datasheet.getRange(questionRow, 1).setValue(set.title).setTextStyle(sectionHeaderFont);
      questionRow++;

      set.sections.forEach(section => {
        datasheet.getRange(questionRow, 2).setValue(section.title)
          .setBorder(false, false, true, false, false, false, "black", SpreadsheetApp.BorderStyle.SOLID)
          .setTextStyle(sectionsetFont)
          .setBackground(section.backgroundColor);
          questionRow++;

          section.questions.forEach(question => {
            let range = datasheet.getRange(questionRow, 1);
            range.setValue(question[0])
                .setBackground(section.backgroundColor)
                .setWrap(true);
            // if (question[0].trim().endsWith('?') === false) {
            //   range.setTextStyle(questionItalics);  
            // }
            datasheet.getRange(questionRow, 2).setBackground(section.backgroundColor);
            questionRow++;
          });
          questionRow++;
      });
    });
    const sheetId = datasheet.getSheetId();
    datasheet.getRange("A5").setFormula('=HYPERLINK("#gid=' + sheetId + '&range=B15", "Basic information")');
    datasheet.getRange("A6").setFormula('=HYPERLINK("#gid=' + sheetId + '&range=B21", "Data Worker Reflections")');
    datasheet.getRange("B5").setFormula('=HYPERLINK("#gid=' + sheetId + '&range=B28", "Motivation")');
    datasheet.getRange("B6").setFormula('=HYPERLINK("#gid=' + sheetId + '&range=B34", "Composition")');
    datasheet.getRange("B7").setFormula('=HYPERLINK("#gid=' + sheetId + '&range=B53", "Collection process")');
    datasheet.getRange("B8").setFormula('=HYPERLINK("#gid=' + sheetId + '&range=B68", "Preprocessing/cleaning/labeling")');
    datasheet.getRange("B9").setFormula('=HYPERLINK("#gid=' + sheetId + '&range=B74", "Uses")');
    datasheet.getRange("B10").setFormula('=HYPERLINK("#gid=' + sheetId + '&range=B82", "Distribution")');
    datasheet.getRange("B11").setFormula('=HYPERLINK("#gid=' + sheetId + '&range=B91", "Maintenance")');
  }
}

/**
 * loadCell function is called from the HTML file to check if the data has changed at all
 * It gets all the information for the currently selected cell and necessary global properties
 * Then cellChanged global variable is set to false
 * Then a cell object is returned to the HTML with all of the updated cell info
 */
function loadCell() {
  sheet = SpreadsheetApp.getActiveSheet();
  cell = sheet.getCurrentCell();
  row = cell.getRow();
  col = cell.getColumn();
  currValue = cell.getValue();
  cellChanged = false;
  var id = cell.getA1Notation();
  const properties = PropertiesService.getScriptProperties();
  cellChanged = properties.getProperty('cellChanged');
  properties.setProperty('cellChanged', false);
  history = cellHistory(sheet.getCurrentCell());
  returnObj = {id: id, row: row, col: col, currValue: currValue, history: history, cellChanged: cellChanged};
  console.log('loadCell return obj: ', returnObj)
  return returnObj;
}

/**
 * onEdit function is automatically triggered by AppsScript when a change is made in the spreadsheet
 * The edit event object e is manipulated slightly
 * Then a new row is added to the log with the corresponding event info
 * Then the updateHistory function is called with the modified event object
 */

function onEdit(e){
  console.log(e);
  console.log("Reached onEdit");

  var sheet = SpreadsheetApp.getActiveSheet();
  console.log("Reached onEdit");
  var editEvent = e;
  editEvent.sheet = e.range.getSheet().getName();
  var log = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Log');

  var user = PropertiesService.getScriptProperties().getProperty("user");
  console.log(user);

  const logPreference = PropertiesService.getScriptProperties().getProperty("logPreference");
  if (logPreference === "name") {
    const userName = PropertiesService.getScriptProperties().getProperty("userName");
    const userEmail = PropertiesService.getScriptProperties().getProperty("userEmail");
    user = `${userName} (${userEmail})`; 
  }

  var currSheet = e.range.getSheet().getName();
  var formula = e.range.getFormula().toString();
  var cell = e.range.getA1Notation();
  var timestamp = new Date();

  if (changeType != null) {
    formula = changeType;
    changeType = null;
  } else {
    if (formula == '') {
      formula = 'Manual Entry'
    } else {
      if (formula[0] == "=") {
        formula = formula.replace(/=/, "")
      }
    }
  }
  if(currSheet != 'Log' && currSheet != "Datasheet") {
    log.appendRow([timestamp, cell, currSheet, e.oldValue, sheet.getCurrentCell().getValue(), formula, user]);
    var rowNum = log.getLastRow();
    /**
     * Moved History update to pull from the log values.
     */
    var historyObject = {
      row: rowNum,
      timestamp: timestamp,
      oldValue: e.oldValue,
      newValue: sheet.getCurrentCell().getValue(),
      formula: formula,
      user: user,
      cell: cell
    };
  }
  updateHistory(editEvent, historyObject);
  logUniqueUsers();
}

/**
 * onSelectionChange function is automatically triggered by AppsScript when the user changes the cell that is currently selected
 * This function sets the global cellChanged variable to true
 */
function onSelectionChange(e) {
  loadCell();
  console.log("Reached onSelection");
  const properties = PropertiesService.getScriptProperties()
  properties.setProperty('cellChanged', true)
}

/**
 * updatehistory function is called when the onEdit trigger has fired
 * It creates a history object using the info from the editEvent object and the corresponding range
 * It retrieves the history object from the global history property
 * If the current sheet and cell already exist in history, then the historyObj is just added to the corresponding array
 * If either of these don't already exist, then the historyObj is added to a new empty array for the corresponding cell
 */
function updateHistory(editEvent, historyObject) {
  var log = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Log').getDataRange();
  console.log("Reached updateHistory");
  console.log('updateHistory called with editEvent: ', editEvent);

  const properties = PropertiesService.getScriptProperties();
  let history = JSON.parse(properties.getProperty('history') || '{}');

  range = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(editEvent.sheet).getRange(editEvent.range.rowStart, editEvent.range.columnStart)
  currSheet = editEvent.sheet;
  cell = range.getA1Notation();
  
  // Ensure the sheet and cell exist in the history object
  if (!(currSheet in history)) {
   history[currSheet] = {};
  }
  if (!(cell in history[currSheet])) {
    history[currSheet][cell] = [];
  }

  // Append the new history object
  history[currSheet][cell].push(historyObject); 
  properties.setProperty('history', JSON.stringify(history));
}

/**
 * createFilter function is called when creating the Log sheet
 * It creates a filter for the entire active dataRange
 */
function createFilter() {
  console.log("Reached createFilter");
  var log = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Log').getDataRange();
  var filter = log.createFilter();
  var criteria = SpreadsheetApp.newFilterCriteria();
  filter.setColumnFilterCriteria(1, criteria);
}

/**
 * cellHistory function is called by the loadCell function to get the updated history for a specific cell
 * It retrieves the current history object and seearches for the specific sheet and cell
 * If the cell exists in the history object, it returns that array
 * If not, it returns and empty array
 */
function cellHistory(cell) {
  const properties = PropertiesService.getScriptProperties();
  const allHistory = JSON.parse(properties.getProperty('history') || '{}');

  // Find history for the specific cell
  const sheetName = cell.getSheet().getName();
  const cellNotation = cell.getA1Notation();

  return allHistory[sheetName]?.[cellNotation] || [];
}


