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
  // protection.removeEditor(Session.getActiveUser());
  // protection.removeEditors(protection.getEditors());
  if (protection.canDomainEdit()) {
    protection.setDomainEdit(false);
  }
}
/**
 * Main function for writing notes; called from page.html in noteDisplay when a 
 * change specific note is created, and from the addGeneralNote function in this file for a general note.
 */
function writeNote(row, note){
  console.log("reached write note")
  var log = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Log');
  log.getLastRow();
  var time = new Date();
  if (log.getRange(row, 8).getDisplayValue() != "") {
    log.getRange(row, 8).setValue(log.getRange(row, 8).getValue() + "\n" + time + "\n" + note + "\n")
  } else {
    log.getRange(row, 8).setValue(log.getRange(row, 8).getValue() + time + "\n " + note +  "\n")
  }
  var ss = SpreadsheetApp.getActiveSheet()
  var cell = ss.getCurrentCell();
  cell.setBackground("red")
  }

/**
 * Function that pulls up a view of all notes for a particular edit as a toast.
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
      var note = data[row][7]
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
 * Script side function for general notes. Will create a new log entry with a change
 */
function addGeneralNote(note){
  var log = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Log');
  sheet = SpreadsheetApp.getActiveSheet();
  cell = sheet.getCurrentCell().getA1Notation();
  var user = Session.getActiveUser().getEmail().toString();
  var timestamp = new Date();
  if(sheet != 'Log' && sheet != "Datasheet") {
    log.appendRow([timestamp, cell, sheet.getName(), "", "", "", user]);
  }
  var rowNum = log.getLastRow();
  writeNote(rowNum, note)
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
  var log = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Log');
  if (log == null) {
    log = SpreadsheetApp.getActiveSpreadsheet().insertSheet(SpreadsheetApp.getActiveSpreadsheet().getNumSheets());
    log.setName('Log');
  }
  var datasheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Datasheet');
  if (datasheet == null) {
    datasheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(SpreadsheetApp.getActiveSpreadsheet().getNumSheets());
    datasheet.setName('Datasheet');
  }
  if (log.getLastRow() == 0) {
    log.appendRow(["Timestamp", "Cell", "Sheet", "Previous Value", "New Value", "Formula", "User", "Notes"]);
    log.setColumnWidth(1, 200.0);
    log.setColumnWidth(7, 200.0);
    var row = log.getDataRange();
    row.setHorizontalAlignment('left');
    row.setBorder(false,false,true,false,false,false);
  }
  if (datasheet.getLastRow() == 0) {
    datasheet.appendRow(["For what purpose was the dataset created?"])
    datasheet.appendRow(["Who created the dataset?"])
    datasheet.appendRow(["Is any information missing from individual instances?"])
    datasheet.appendRow(["Are there any errors, sources of noise, or redundancies in the dataset?"])
    datasheet.appendRow(["How was the data associated with each instance acquired? "])
    datasheet.appendRow(["Is there anything about the composition of the dataset or the way it was collected and preprocessed/cleaned/labeled/ that might impact future users?"])
    datasheet.appendRow(["What data does each instance consist of?"])
    datasheet.appendRow(["Does the dataset contain data that may be harmful or confidential?"])
    datasheet.appendRow(["Are the individuals unintentionally identifiable by the data?"])
    datasheet.appendRow(["Does the dates contain data that might be considered sensitive?"])
  }
  if(log.getFilter() == null) {
    createFilter();
  }
  var sheet = SpreadsheetApp.getActiveSheet();
  const properties = PropertiesService.getScriptProperties();
  properties.setProperties({
    'history': JSON.stringify({}),
    'cellChanged': false
    })
  var html = HtmlService.createHtmlOutputFromFile('Page').setTitle('Datum Fieldnotes');
  SpreadsheetApp.getUi().showSidebar(html);
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
 * Work in progress function for logging change types as a means of keeping track of row/column deletion
 */
// var changeType
// function onChange(e) {
//   console.log("Reached onChange")
//   changeType = e.changeType;
//   var user = PropertiesService.getScriptProperties().getProperty("user");
//   var sheet = SpreadsheetApp.getActiveSheet();
//   var log = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Log');
//   var timestamp = new Date();
//   if(sheet != 'Log' && sheet != "Datasheet") {
//     log.appendRow([timestamp, "", sheet.getName(), "", sheet.getCurrentCell().getValue(), changeType, user]);
//   }
// }

/**
 * onEdit function is automatically triggered by AppsScript when a change is made in the spreadsheet
 * The edit event object e is manipulated slightly
 * Then a new row is added to the log with the corresponding event info
 * Then the updateHistory function is called with the modified event object
 */
function onEdit(e) {
  var sheet = SpreadsheetApp.getActiveSheet()
  console.log("Reached onEdit");
  var editEvent = e
  editEvent.sheet = e.range.getSheet().getName()
  var log = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Log');
  var user = PropertiesService.getScriptProperties().getProperty("user");
  console.log(user);
  var currSheet = e.range.getSheet().getName();
  var formula = e.range.getFormula().toString();
  var cell = e.range.getA1Notation();
  var timestamp = new Date();
  if (changeType != null) {
    formula = changeType
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
      user: user
    };
  }
  updateHistory(editEvent, historyObject);
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
  console.log('updateHistory called with editEvent: ', editEvent)
  const properties = PropertiesService.getScriptProperties();
  range = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(editEvent.sheet).getRange(editEvent.range.rowStart, editEvent.range.columnStart)
  currSheet = editEvent.sheet;
  cell = range.getA1Notation();
  tempHistory = JSON.parse(properties.getProperty('history'));
  if(currSheet in tempHistory == false) {
    console.log("Reached new sheet in history");
    tempHistory[currSheet] = {};
    tempHistory[currSheet][cell] = [historyObject];
  } else {
    if(cell in tempHistory[currSheet] == false) {
      console.log("Reached new history object");
      tempHistory[currSheet][cell] = [historyObject];
    } else {
      console.log("Reached update of current history object");
      tempHistory[currSheet][cell].push(historyObject);
    }
  }

  properties.setProperty('history', JSON.stringify(tempHistory));
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
  var currSheet = cell.getSheet().getName();
  var currCell = cell.getA1Notation();
  const properties = PropertiesService.getScriptProperties()
  tempHistory = JSON.parse(properties.getProperty('history'));
  if(tempHistory[currSheet] && tempHistory[currSheet][currCell]) {
    return tempHistory[currSheet][currCell];
  } else {
    return []
  }
}
