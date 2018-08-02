﻿import * as ID from "./ids";
import * as constants from "./constants";
import { notifySuccess, notifyError, getActionUrl, showYesNoCancelDialog, blockUI, unblockUI, isValidFileName, decipherJqXhrError } from "./utils";
import { setupSecurityPrincipals, showSecurityPrincipals, hideSecurityPrincipals, resetSecurityPrincipals, loadSecurityPrincipals, verifySaveChanges as spVerifySaveChanges } from "./sp";
import { setupSecureObjects, hideSecureObjects, showSecureObjects, resetSecureObjects, loadSecureObjectsTree } from "./so";

var _$tbMain = $(ID.TB_MAIN);

// TODO: Check if the parameters passed to kendo.observable are correct
var mainVM = {
    fileName: "",
    hasChanges: false,
    init: function () {
        this.fileName = null;
        this.hasChanges = false;
    },
    setChange: function (trueorfalse: boolean) {
        this.hasChanges = trueorfalse;
    }
};
var originalWindowTitle = document.title;

// https://www.telerik.com/blogs/how-to-do-javascript-alerts-without-being-a-jerk
// create the widgets once, and store a reference to it so it can be used again and again
// resolve(fileName) or reject() when no file selected
var selectFile = (function () {
    let dfd: JQueryDeferred<string> = $.Deferred();
    var fileName = "";

    var dsFileExplorer = new kendo.data.HierarchicalDataSource({
        transport: {
            read: {
                url: getActionUrl("GetDirectoryContents", "Admin"),
                dataType: "json"
            }
        },
        schema: {
            model: {
                id: "Path",
                //hasChildren: "HasChildren"  
                //use a function to dynamically add an item/field to the node. https://stackoverflow.com/questions/13629373/kendo-ui-treeview-sprite-altering-template
                hasChildren: function (node: any) { // TODO: Specify more specific type
                    if (node.Type == "File")
                        node.spriteCssClass = "file";
                    else
                        node.spriteCssClass = "folder";
                    return node.HasChildren;

                }
            }
        }
    });

    var $dlgSelectFile = $(ID.DLG_SELECT_FILE);
    $dlgSelectFile.kendoDialog({
        width: "400px",
        visible: false,
        title: "Open File",
        closable: true,
        modal: true,
        content: "<div id='tvSelectFile'></div>",
        open: function () {
            $("body").addClass("no-scroll"); // stops background from scrolling when dialog is open
            if (dsFileExplorer.data().length == 0)
                dsFileExplorer.read();
        },
        close: function () {
            $("body").removeClass("no-scroll");
            if (fileName == null) {
                dfd.reject();
            }
            else {
                dfd.resolve(fileName);
            }
        },
        actions: [
            {
                text: 'OK',
                primary: true,
                action: function () {
                    var ok = false;
                    var selected = k$tvSelectFile.select();
                    var item: any = k$tvSelectFile.dataItem(selected); // TODO: It is supposed to be a node.
                    if (item) {
                        if (item.Type != "File") {
                            kendo.alert("Select a file");
                        }
                        else {
                            ok = true; // assume ok so dialog can be closed
                            fileName = item.Path;
                        }
                    }
                    else {
                        kendo.alert("Select a file");
                    }
                    return ok;
                }
            },
            { text: 'Cancel' },
            {
                text: 'Refresh',
                action: function () {
                    console.log("-- Refreshing file explorer");
                    dsFileExplorer.read();
                    return false;
                }
            }
        ]
    });
    var k$dlgSelectFile = $dlgSelectFile.data("kendoDialog");

    var $tvSelectFile = $(ID.TREEVIEW_SELECT_FILE);
    $tvSelectFile.kendoTreeView({
        autoBind: false,
        dataSource: dsFileExplorer,
        dataTextField: "Name"
    });
    var k$tvSelectFile = $tvSelectFile.data("kendoTreeView");

    return function () {
        console.log("In selectFile...");
        dfd = $.Deferred();
        fileName = null;
        k$dlgSelectFile.open();

        return dfd.promise();
    };
}());


// resolve(fileName) or reject() when no file selected
var selectSaveAsFileName = (function () {
    let dfd: JQueryDeferred<string> = $.Deferred();

    var fileName = "";

    var dsFileExplorer = new kendo.data.HierarchicalDataSource({
        transport: {
            read: {
                url: getActionUrl("GetDirectoryContents", "Admin"),
                dataType: "json"
            }
        },
        schema: {
            model: {
                id: "Path",
                //hasChildren: "HasChildren"  
                //use a function to dynamically add an item/field to the node. https://stackoverflow.com/questions/13629373/kendo-ui-treeview-sprite-altering-template
                hasChildren: function (node: any) {
                    if (node.Type == "File")
                        node.spriteCssClass = "file";
                    else
                        node.spriteCssClass = "folder";
                    return node.HasChildren;

                }
            }
        }
    });

    var $dlgSaveAs = $(ID.DLG_SAVE_AS);
    $dlgSaveAs.kendoDialog({
        width: "400px",
        visible: false,
        title: "Save As",
        closable: true,
        modal: true,
        content: "<div id='tvSaveAs'></div><div style='margin-top:20px'><label>File name </label>&nbsp;&nbsp;<input id='txtSaveAsName' class='k-textbox' /><label>" + constants.FILE_EXTENSION + "</label></div>",
        open: function () {
            $("body").addClass("no-scroll"); // stops background from scrolling when dialog is open
            if (dsFileExplorer.data().length == 0)
                dsFileExplorer.read();
        },
        close: function () {
            $("body").removeClass("no-scroll");
            if (fileName == null) {
                dfd.reject();
            }
            else {
                dfd.resolve(fileName);
            }
        },
        actions: [
            {
                text: 'OK',
                primary: true,
                action: function () {
                    var ok = false;
                    var fn: string = $txtSaveAsName.val() as string; // TODO: It was a number by default.
                    fn = fn.trim().substr(0, fn.lastIndexOf('.')) || fn;
                    $txtSaveAsName.val(fn);
                    var selected = k$tvSaveAs.select();
                    // file name specified?
                    if (fn.length == 0) {
                        kendo.alert("Choose a folder and enter a file name");
                    }
                    else if (!isValidFileName(fn)) {
                        kendo.alert("File name is not valid");
                    }
                    else if (selected.length == 0) {
                        kendo.alert("Choose a folder and enter a file name");
                    }
                    else {
                        // file name entered, something is selected
                        var item: any = k$tvSaveAs.dataItem(selected); // TODO: It was supposed to be a node type.
                        var folder = null;
                        if (item.Type == "File") {
                            var tmp: any = k$tvSaveAs.dataItem(k$tvSaveAs.parent(selected)); // TODO: Added by me
                            folder = tmp.Path;
                        }
                        else {
                            folder = item.Path;
                        }
                        fileName = folder + fn + constants.FILE_EXTENSION;
                        ok = true;
                    }

                    return ok;
                }
            },
            { text: 'Cancel' },
            {
                text: 'Refresh',
                action: function () {
                    console.log("-- Refreshing file explorer");
                    dsFileExplorer.read();
                    return false;
                }
            }
        ]
    });
    var k$dlgSaveAs = $dlgSaveAs.data("kendoDialog");

    var $tvSaveAs = $(ID.TREEVIEW_SAVE_AS);
    var $txtSaveAsName = $(ID.TXT_SAVE_AS_NAME);
    $tvSaveAs.kendoTreeView({
        autoBind: false,
        dataSource: dsFileExplorer,
        dataTextField: "Name",
        change: function (e) {
            //console.log( this.select() )
            var selected = this.select();
            var item = this.dataItem(selected);
            if (item)
                if (item.Type == "File") {
                    // get the base name, minus extension, and populate the file name text box
                    var name = item.Name;
                    $txtSaveAsName.val(name.substr(0, name.lastIndexOf('.')) || name);
                }
        }
    });
    var k$tvSaveAs = $tvSaveAs.data("kendoTreeView");

    return function () {
        console.log("In selectSaveAsFileName...");
        dfd = $.Deferred();
        fileName = null;
        k$dlgSaveAs.open();

        return dfd.promise();
    };
}());

function init() {

    setupWidgets();
    setupVariables();
    setupEventHandlers();

    kendo.bind(_$tbMain, mainVM);
    setupSecurityPrincipals();
    setupSecureObjects();

    // turn off autocomplete & autocorrect
    $('input').attr('autocomplete', 'off');
    $('input').attr('autocorrect', 'off');

    // default to this view    
    //$( ID.BTN_SHOW_SECURITY_PRINCIPALS ).click()
    $(ID.BTN_SHOW_SECURE_OBJECTS).click();
}


function setupWidgets() {
}

function setupVariables() {

    //_k$tvFileExplorer = _$tvFileExplorer.data('kendoTreeView')
    //_k$dlgFileExplorer = _$dlgFileExplorer.data('kendoDialog') 

}

function setupEventHandlers() {
    $(".accordion h2").click(function () {
        $(this).next().toggle();
        //$( this ).find( "span:first-child" ).toggleClass( "k-i-arrow-chevron-up k-i-arrow-chevron-down" )
        $(this).find("span.k-i-arrow-chevron-up, span.k-i-arrow-chevron-down").toggleClass("k-i-arrow-chevron-up k-i-arrow-chevron-down");
    });
}
function openFile(fileName: string) {
    console.log("In openFile...");
    console.log("-- File name: " + fileName);

    if (!fileName) return;

    $.ajax({
        method: 'GET',
        url: getActionUrl("OpenFile", "Admin"),
        data: { 'fileName': fileName },
        dataType: 'json'
    }).done(function (data, textStatus, xhr) {
        if (data.Status == constants.SUCCESS) {
            mainVM.init();
            mainVM.fileName = fileName;

            setWindowTitle(fileName);
            resetSecurityPrincipals();
            loadSecurityPrincipals();
            resetSecureObjects();
            loadSecureObjectsTree();
        }
        else {
            notifyError(data.Message);
        }
    }).fail(function (xhr, textStatus, errorThrown) {
        notifyError("There was a problem opening the file");
    });
}

function newFile() {
    console.log("In newFile...");
    $.ajax({
        method: 'POST',
        url: getActionUrl("NewFile", "Admin"),
        dataType: 'json'
    })
        .done(function (data, textStatus, xhr) {
            if (data.Status !== constants.SUCCESS) {
                notifyError("Unable to initialize suplex store");
            }
            else {
                mainVM.init();

                setWindowTitle(""); // TODO: Check what would be an appropriate title?
                resetSecurityPrincipals();
                resetSecureObjects();
            }
        })
        .fail(function (xhr, textStatus, errorThrown) {
            notifyError("Unable to initialize suplex store");
            console.log(xhr);
        });
}

function btnNewFileClick() {
    console.log("In btnNewFileClick...");
    spVerifySaveChanges()
        .then(function (proceed) {
            //return ( proceed ? soVerifySaveChanges() : $.Deferred.resolve( false ) )
            return (proceed); // to revisit after secure object is done
        })
        .then(function (proceed) {
            return (proceed ? verifySaveChangesToStore() : false);
        })
        .then(function (proceed) {
            if (proceed) {
                newFile();
            }
        });
}
function btnOpenFileClick() {
    console.log("In btnOpenFileClick...");
    spVerifySaveChanges()
        .then(function (proceed) {
            //return ( proceed ? soVerifySaveChanges() : $.Deferred.resolve( false ) )
            //return ( proceed ? $.Deferred().resolve( true ) : $.Deferred().resolve( false ) )
            return (proceed); // for now do this. need to go thru when Secure Object is ready
        })
        .then(function (proceed) {
            return (proceed ? verifySaveChangesToStore() : false);
        })
        .then(function (proceed) {
            if (proceed) {
                selectFile().then(openFile);
            }
        });
}

function btnSaveFileClick(e: any) {
    console.log("In btnSaveFileClick...");

    switch ("#" + e.id) {
        case "": break;
        case ID.BTN_SAVE_FILE: // "btnSaveFile":
            console.log("-- save");
            let fileName: string = mainVM.fileName;
            if (fileName != null) {
                blockUI();
                saveFile(fileName).always(unblockUI);
                break;
            }

        case ID.BTN_SAVE_FILE_AS: // "btnSaveFileAs":
            console.log("-- save file as");
            selectSaveAsFileName()
                .then(function (fileName) {
                    blockUI();
                    return saveFile(fileName);
                })
                .always(unblockUI);

            break;
    }
}

// resolve(true) if discard changes or save successful
// resolve(false) if save failed or cancel selected
function verifySaveChangesToStore() {
    console.log("In verifySaveChangesToStore...");
    let dfd: JQueryDeferred<boolean> = $.Deferred();
    console.log(mainVM.hasChanges);
    if (!mainVM.hasChanges) {
        dfd.resolve(true);
    }
    else {
        var isNewFile = mainVM.fileName ? false : true;
        var message = "Save changes to " + (isNewFile ? "NewFile" : mainVM.fileName) + "?";
        $.when(showYesNoCancelDialog("Save changes?", message)).then(function (response) {
            console.log("-- Response is " + response);
            switch (response) {
                case 1: // save
                    var promise = isNewFile ? selectSaveAsFileName() : $.Deferred().resolve();
                    // TODO: This needs to be fixed.
                    // promise.then(saveFile).then(function (saveResult: any) { dfd.resolve(saveResult) });
                                        
                    break;
                case 2: // discard
                    dfd.resolve(true);

                    break;
                case 3: // cancel action
                    dfd.resolve(false);

                    break;
            }
        });
    }

    return dfd.promise();
}

// resolve(true) when file save is successful, resolve(false) if otherwise
function saveFile(fileName: string): JQueryPromise<boolean> {
    console.log("In saveFile...");
    console.log("-- File name: " + fileName);

    var data = fileName ? { fileName: fileName } : null;
    let dfd: JQueryDeferred<boolean> = $.Deferred();

    $.ajax({
        method: 'POST',
        url: getActionUrl("SaveFile", "Admin"),
        data: data, //{ fileName: fileName } ,
        dataType: 'json'
    })
        .then(
            function (data) {
                if (data.Status == constants.SUCCESS) {
                    if (fileName) {
                        mainVM.init();
                        mainVM.fileName = fileName;
                        setWindowTitle(fileName);
                    }
                    else {
                        mainVM.hasChanges = false;
                    }

                    notifySuccess("File " + mainVM.fileName + " saved successfully");
                    dfd.resolve(true);
                }
                else {
                    notifyError(data.Message);
                    dfd.resolve(false);
                }
            },
            function (jqXHR, textStatus, errorThrown) {
                let msg = decipherJqXhrError(jqXHR, textStatus);
                notifyError("An error has occurred while saving file " + (fileName ? fileName : mainVM.fileName) + ".<br/>" + "Error: " + msg);
                dfd.resolve(false);
            });

    return dfd.promise();
}
function switchView(e: any) {
    console.log("In switchView...");
    switch (e.id) {
        case "btnShowSecurityPrincipals":
            hideSecureObjects();
            showSecurityPrincipals();
            break;
        case "btnShowSecureObjects":
            hideSecurityPrincipals();
            showSecureObjects();
            break;
        default:
            hideSecurityPrincipals();
            hideSecureObjects();
    }
}

function setWindowTitle(fileName: string) {
    document.title = originalWindowTitle + " " + fileName;
}

$(document).ready(function () {
    init();
    $("html").removeClass("no-fouc");
});

//function togglePanel(e) {
//    //alert( "togglepanel" )
//    //console.log( e )
//    console.log( this )
//    console.log( $(this).next().toggle())
//}
export { btnOpenFileClick, btnNewFileClick, btnSaveFileClick, switchView, mainVM }

export { getSecurityPrincipalIconClass, spBtnNewUserClick, spBtnNewGroupClick, spBtnSaveClick, spBtnDiscardClick, spBtnDeleteClick } from "./sp"
export { soTvDataBound, soTvDrop, soTvDrag, soBtnNewClick, soBtnDeleteClick, soBtnExpandAllClick, soBtnCollapseAllClick, soBtnSaveClick, soBtnDiscardClick } from "./so"