import * as ID from "./ids";
import * as constants from "./constants";
import { notifySuccess, notifyError, getActionUrl, showYesNoCancelDialog, showProgress, hideProgress, isValidFileName, decipherJqXhrError, AjaxResponse, AjaxResponseStatus } from "./utils";
import {
    spSetup,
    spShow,
    spHide,
    spReset,
    spLoad,
    verifySaveChanges as spVerifySaveChanges,
} from "./sp";
import { soSetup, soHide, soShow, soReset, soLoad } from "./so";

let $tbMain = $(ID.TB_MAIN);

let mainVM = kendo.observable({
    fileName: null,
    hasChanges: false,
    init: function() {
        this.fileName = null;
        this.hasChanges = false;
    },
    setChange: function(trueorfalse: boolean) {
        this.hasChanges = trueorfalse;
    },
});
let originalWindowTitle = document.title;

// https://www.telerik.com/blogs/how-to-do-javascript-alerts-without-being-a-jerk
// create the widgets once, and store a reference to it so it can be used again and again
// resolve(fileName) or reject() when no file selected
/*let selectFile = (function() {
    let dfd: JQueryDeferred<string> = $.Deferred();
    let fileName: string;

    let dsFileExplorer = new kendo.data.HierarchicalDataSource({
        transport: {
            read: {
                url: getActionUrl("GetDirectoryContents", "Admin"),
                dataType: "json",
            },
        },
        schema: {
            model: {
                id: "Path",
                //hasChildren: "HasChildren"
                //use a function to dynamically add an item/field to the node. https://stackoverflow.com/questions/13629373/kendo-ui-treeview-sprite-altering-template
                hasChildren: function(node: any) {
                    // TODO: Put explicit type
                    if (node.Type == "File") node.spriteCssClass = "file";
                    else node.spriteCssClass = "folder";
                    return node.HasChildren;
                },
            },
        },
    });

    let $dlgSelectFile = $(ID.DLG_SELECT_FILE);
    $dlgSelectFile.kendoDialog({
        width: "400px",
        visible: false,
        title: "Open File",
        closable: true,
        modal: true,
        content: "<div id='tvSelectFile'></div>",
        open: function() {
            $("body").addClass("no-scroll"); // stops background from scrolling when dialog is open
            if (dsFileExplorer.data().length == 0) dsFileExplorer.read();
        },
        close: function() {
            $("body").removeClass("no-scroll");
            if (fileName == null) {
                dfd.reject();
            } else {
                dfd.resolve(fileName);
            }
        },
        actions: [
            {
                text: "OK",
                primary: true,
                action: function() {
                    let ok = false;
                    let selected = k$tvSelectFile.select();
                    let item: any = k$tvSelectFile.dataItem(selected); // TODO: Should be kendo.data.Node type.
                    if (item) {
                        if (item.Type != "File") {
                            kendo.alert("Select a file");
                        } else {
                            ok = true; // assume ok so dialog can be closed
                            fileName = item.Path;
                        }
                    } else {
                        kendo.alert("Select a file");
                    }
                    return ok;
                },
            },
            { text: "Cancel" },
            {
                text: "Refresh",
                action: function() {
                    console.log("-- Refreshing file explorer");
                    dsFileExplorer.read();
                    return false;
                },
            },
        ],
    });
    let k$dlgSelectFile = $dlgSelectFile.data("kendoDialog");

    let $tvSelectFile = $(ID.TREEVIEW_SELECT_FILE);
    $tvSelectFile.kendoTreeView({
        autoBind: false,
        dataSource: dsFileExplorer,
        dataTextField: "Name",
    });
    let k$tvSelectFile = $tvSelectFile.data("kendoTreeView");

    return function() {
        console.log("In selectFile...");
        dfd = $.Deferred();
        fileName = null;
        k$dlgSelectFile.open();

        return dfd.promise();
    };
})();*/

// Testing conversion to class
class SelectFile {
    dfd: JQueryDeferred<string> = $.Deferred();
    fileName: string;
    dsFileExplorer: kendo.data.HierarchicalDataSource;
    k$dlgSelectFile: kendo.ui.Dialog;
    k$tvSelectFile: kendo.ui.TreeView;

    constructor() {
        this.dsFileExplorer = new kendo.data.HierarchicalDataSource({
            transport: {
                read: {
                    url: getActionUrl("GetDirectoryContents", "Admin"),
                    dataType: "json",
                },
            },
            schema: {
                model: {
                    id: "Path",
                    //hasChildren: "HasChildren"
                    //use a function to dynamically add an item/field to the node. https://stackoverflow.com/questions/13629373/kendo-ui-treeview-sprite-altering-template
                    hasChildren: function(node: any) {
                        // TODO: Put explicit type
                        if (node.Type == "File") node.spriteCssClass = "file";
                        else node.spriteCssClass = "folder";
                        return node.HasChildren;
                    },
                },
            },
        });

        let $dlgSelectFile = $(ID.DLG_SELECT_FILE);
        $dlgSelectFile.kendoDialog({
            width: "400px",
            visible: false,
            title: "Open File",
            closable: true,
            modal: true,
            content: "<div id='tvSelectFile'></div>",
            open: () => {
                $("body").addClass("no-scroll"); // stops background from scrolling when dialog is open
                if (this.dsFileExplorer.data().length == 0) this.dsFileExplorer.read();
            },
            close: () => {
                $("body").removeClass("no-scroll");
                if (this.fileName == null) {
                    this.dfd.reject();
                } else {
                    this.dfd.resolve(this.fileName);
                }
            },
            actions: [
                {
                    text: "OK",
                    primary: true,
                    action: () => {
                        let ok = false;
                        let selected = this.k$tvSelectFile.select();
                        let item: any = this.k$tvSelectFile.dataItem(selected); // TODO: Should be kendo.data.Node type.
                        if (item) {
                            if (item.Type != "File") {
                                kendo.alert("Select a file");
                            } else {
                                ok = true; // assume ok so dialog can be closed
                                this.fileName = item.Path;
                            }
                        } else {
                            kendo.alert("Select a file");
                        }
                        return ok;
                    },
                },
                { text: "Cancel" },
                {
                    text: "Refresh",
                    action: () => {
                        console.log("-- Refreshing file explorer");
                        this.dsFileExplorer.read();
                        return false;
                    },
                },
            ],
        });
        this.k$dlgSelectFile = $dlgSelectFile.data("kendoDialog");

        let $tvSelectFile = $(ID.TREEVIEW_SELECT_FILE);
        $tvSelectFile.kendoTreeView({
            autoBind: false,
            dataSource: this.dsFileExplorer,
            dataTextField: "Name",
        });
        this.k$tvSelectFile = $tvSelectFile.data("kendoTreeView");
    }

    OpenDialog(): JQuery.Promise<string> {
        console.log("In selectFile.OpenDialog ...");
        this.dfd = $.Deferred();
        this.fileName = null;
        this.k$dlgSelectFile.open();

        return this.dfd.promise();
    }
}
let selectFile = new SelectFile();
console.log("Testing class conversion");
console.log(selectFile);

// Testing conversion to class

class SelectSaveAsFileName {
    dfd: JQueryDeferred<string> = $.Deferred();
    fileName: string;
    dsFileExplorer: kendo.data.HierarchicalDataSource;
    k$dlgSaveAs: kendo.ui.Dialog;;
    k$tvSaveAs: kendo.ui.TreeView;

    constructor() {
        this.dsFileExplorer = new kendo.data.HierarchicalDataSource( {
            transport: {
                read: {
                    url: getActionUrl( "GetDirectoryContents", "Admin" ),
                    dataType: "json",
                },
            },
            schema: {
                model: {
                    id: "Path",
                    //hasChildren: "HasChildren"
                    //use a function to dynamically add an item/field to the node. https://stackoverflow.com/questions/13629373/kendo-ui-treeview-sprite-altering-template
                    hasChildren: function ( node: any ) {
                        // TODO: Put explicit type
                        if ( node.Type == "File" ) node.spriteCssClass = "file";
                        else node.spriteCssClass = "folder";
                        return node.HasChildren;
                    },
                },
            },
        } );
        let $dlgSaveAs = $( ID.DLG_SAVE_AS );

        // resolve(fileName) or reject() when no file selected
        $dlgSaveAs.kendoDialog( {
            width: "400px",
            visible: false,
            title: "Save As",
            closable: true,
            modal: true,
            content:
                "<div id='tvSaveAs'></div><div style='margin-top:20px'><label>File name </label>&nbsp;&nbsp;<input id='txtSaveAsName' class='k-textbox' /><label>" +
                constants.FILE_EXTENSION +
                "</label></div>",
            open: () => {
                $( "body" ).addClass( "no-scroll" ); // stops background from scrolling when dialog is open
                if ( this.dsFileExplorer.data().length == 0 ) this.dsFileExplorer.read();
            },
            close: () => {
                $( "body" ).removeClass( "no-scroll" );
                if ( this.fileName == null ) {
                    this.dfd.reject();
                } else {
                    this.dfd.resolve( this.fileName );
                }
            },
            actions: [
                {
                    text: "OK",
                    primary: true,
                    action: () => {
                        let ok = false;
                        let fn = ( $txtSaveAsName.val() as string ).trim();
                        fn = fn.substr( 0, fn.lastIndexOf( "." ) ) || fn;
                        $txtSaveAsName.val( fn );
                        let selected = this.k$tvSaveAs.select();
                        // file name specified?
                        if ( fn.length == 0 ) {
                            kendo.alert( "Choose a folder and enter a file name" );
                        } else if ( !isValidFileName( fn ) ) {
                            kendo.alert( "File name is not valid" );
                        } else if ( selected.length == 0 ) {
                            kendo.alert( "Choose a folder and enter a file name" );
                        } else {
                            // file name entered, something is selected
                            let item: any = this.k$tvSaveAs.dataItem( selected ); // TODO: Should be of a specific type.
                            let folder = null;
                            if ( item.Type == "File" ) {
                                folder = ( this.k$tvSaveAs.dataItem( this.k$tvSaveAs.parent( selected ) ) as any ).Path; // TODO: Should be of a specific type.
                            } else {
                                folder = item.Path;
                            }
                            this.fileName = folder + fn + constants.FILE_EXTENSION;
                            ok = true;
                        }
                        return ok;
                    },
                },
                { text: "Cancel" },
                {
                    text: "Refresh",
                    action: () => {
                        console.log( "-- Refreshing file explorer" );
                        this.dsFileExplorer.read();
                        return false;
                    },
                },
            ],
        } );
        this.k$dlgSaveAs = $dlgSaveAs.data( "kendoDialog" );

        let $tvSaveAs = $( ID.TREEVIEW_SAVE_AS );
        let $txtSaveAsName = $( ID.TXT_SAVE_AS_NAME );
        $tvSaveAs.kendoTreeView( {
            autoBind: false,
            dataSource: this.dsFileExplorer,
            dataTextField: "Name",
            change: function ( e ) {
                //console.log( this.select() )
                let selected = this.select();
                let item = this.dataItem( selected );
                if ( item )
                    if ( item.Type == "File" ) {
                        // get the base name, minus extension, and populate the file name text box
                        let name = item.Name;
                        $txtSaveAsName.val( name.substr( 0, name.lastIndexOf( "." ) ) || name );
                    }
            },
        } );
        this.k$tvSaveAs = $tvSaveAs.data( "kendoTreeView" );
    }
    OpenDialog(): JQuery.Promise<string> {
        console.log( "In SelectSaveAsFileName.OpenDialog ..." );
        this.dfd = $.Deferred();
        this.fileName = null;
        this.k$dlgSaveAs.open();

        return this.dfd.promise();
    }
}
let selectSaveAsFileName = new SelectSaveAsFileName();

// resolve(fileName) or reject() when no file selected
//let selectSaveAsFileName = (function() {
//    let dfd: JQueryDeferred<string> = $.Deferred();
//    let fileName: string;

//    let dsFileExplorer = new kendo.data.HierarchicalDataSource({
//        transport: {
//            read: {
//                url: getActionUrl("GetDirectoryContents", "Admin"),
//                dataType: "json",
//            },
//        },
//        schema: {
//            model: {
//                id: "Path",
//                //hasChildren: "HasChildren"
//                //use a function to dynamically add an item/field to the node. https://stackoverflow.com/questions/13629373/kendo-ui-treeview-sprite-altering-template
//                hasChildren: function(node: any) {
//                    // TODO: Put explicit type
//                    if (node.Type == "File") node.spriteCssClass = "file";
//                    else node.spriteCssClass = "folder";
//                    return node.HasChildren;
//                },
//            },
//        },
//    });

//    let $dlgSaveAs = $(ID.DLG_SAVE_AS);
//    $dlgSaveAs.kendoDialog({
//        width: "400px",
//        visible: false,
//        title: "Save As",
//        closable: true,
//        modal: true,
//        content:
//            "<div id='tvSaveAs'></div><div style='margin-top:20px'><label>File name </label>&nbsp;&nbsp;<input id='txtSaveAsName' class='k-textbox' /><label>" +
//            constants.FILE_EXTENSION +
//            "</label></div>",
//        open: function() {
//            $("body").addClass("no-scroll"); // stops background from scrolling when dialog is open
//            if (dsFileExplorer.data().length == 0) dsFileExplorer.read();
//        },
//        close: function() {
//            $("body").removeClass("no-scroll");
//            if (fileName == null) {
//                dfd.reject();
//            } else {
//                dfd.resolve(fileName);
//            }
//        },
//        actions: [
//            {
//                text: "OK",
//                primary: true,
//                action: function() {
//                    let ok = false;
//                    let fn = ($txtSaveAsName.val() as string).trim();
//                    fn = fn.substr(0, fn.lastIndexOf(".")) || fn;
//                    $txtSaveAsName.val(fn);
//                    let selected = k$tvSaveAs.select();
//                    // file name specified?
//                    if (fn.length == 0) {
//                        kendo.alert("Choose a folder and enter a file name");
//                    } else if (!isValidFileName(fn)) {
//                        kendo.alert("File name is not valid");
//                    } else if (selected.length == 0) {
//                        kendo.alert("Choose a folder and enter a file name");
//                    } else {
//                        // file name entered, something is selected
//                        let item: any = k$tvSaveAs.dataItem(selected); // TODO: Should be of a specific type.
//                        let folder = null;
//                        if (item.Type == "File") {
//                            folder = (k$tvSaveAs.dataItem(k$tvSaveAs.parent(selected)) as any).Path; // TODO: Should be of a specific type.
//                        } else {
//                            folder = item.Path;
//                        }
//                        fileName = folder + fn + constants.FILE_EXTENSION;
//                        ok = true;
//                    }
//                    return ok;
//                },
//            },
//            { text: "Cancel" },
//            {
//                text: "Refresh",
//                action: function() {
//                    console.log("-- Refreshing file explorer");
//                    dsFileExplorer.read();
//                    return false;
//                },
//            },
//        ],
//    });
//    let k$dlgSaveAs = $dlgSaveAs.data("kendoDialog");

//    let $tvSaveAs = $(ID.TREEVIEW_SAVE_AS);
//    let $txtSaveAsName = $(ID.TXT_SAVE_AS_NAME);
//    $tvSaveAs.kendoTreeView({
//        autoBind: false,
//        dataSource: dsFileExplorer,
//        dataTextField: "Name",
//        change: function(e) {
//            //console.log( this.select() )
//            let selected = this.select();
//            let item = this.dataItem(selected);
//            if (item)
//                if (item.Type == "File") {
//                    // get the base name, minus extension, and populate the file name text box
//                    let name = item.Name;
//                    $txtSaveAsName.val(name.substr(0, name.lastIndexOf(".")) || name);
//                }
//        },
//    });
//    let k$tvSaveAs = $tvSaveAs.data("kendoTreeView");

//    return function() {
//        console.log("In selectSaveAsFileName...");
//        dfd = $.Deferred();
//        fileName = null;
//        k$dlgSaveAs.open();

//        return dfd.promise();
//    };
//})();

function init() {
    setupWidgets();
    setupVariables();
    setupEventHandlers();

    kendo.bind($tbMain, mainVM);
    spSetup();
    soSetup();

    // turn off autocomplete & autocorrect
    $("input").attr("autocomplete", "off");
    $("input").attr("autocorrect", "off");

    // default to this view
    //$( ID.BTN_SHOW_SECURITY_PRINCIPALS ).click()
    $(ID.BTN_SHOW_SECURE_OBJECTS).click();
}

function setupWidgets() {}

function setupVariables() {
    //_k$tvFileExplorer = _$tvFileExplorer.data('kendoTreeView');
    //_k$dlgFileExplorer = _$dlgFileExplorer.data('kendoDialog');
}

function setupEventHandlers() {
    $(".accordion h2").click(function() {
        $(this)
            .next()
            .toggle();
        //$( this ).find( "span:first-child" ).toggleClass( "k-i-arrow-chevron-up k-i-arrow-chevron-down" )
        $(this)
            .find("span.k-i-arrow-chevron-up, span.k-i-arrow-chevron-down")
            .toggleClass("k-i-arrow-chevron-up k-i-arrow-chevron-down");
    });
}
function openFile(fileName: string) {
    console.log("In openFile...");
    console.log("-- File name: " + fileName);

    if (!fileName) return;

    $.ajax({
        method: "GET",
        url: getActionUrl("OpenFile", "Admin"),
        data: { fileName: fileName },
        dataType: "json",
    })
        .done((data: AjaxResponse) => {
            if (data.Status == AjaxResponseStatus.Success) {
                mainVM.init();
                mainVM.set("fileName", fileName);

                setWindowTitle(fileName);
                spReset();
                spLoad();
                soReset();
                soLoad();
            } else {
                notifyError(data.Message);
            }
        })
        .fail( ( xhr: JQueryXHR, textStatus: string ) => {
            notifyError("There was a problem opening the file");
        });
}

function newFile() {
    console.log("In newFile...");
    $.ajax({
        method: "POST",
        url: getActionUrl("NewFile", "Admin"),
        dataType: "json",
    })
        .done((data: AjaxResponse) => {
            if (data.Status != AjaxResponseStatus.Success ) {
                notifyError("Unable to initialize suplex store");
            } else {
                mainVM.init();
                setWindowTitle();
                spReset();
                soReset();
            }
        })
        .fail( ( xhr: JQueryXHR, textStatus: string ) => {
            notifyError("Unable to initialize suplex store");
            console.log(xhr);
        });
}

function btnNewFileClick() {
    console.log("In btnNewFileClick...");
    spVerifySaveChanges()
        .then(function(proceed) {
            //return ( proceed ? soVerifySaveChanges() : $.Deferred.resolve( false ) )
            return proceed; // to revisit after secure object is done
        })
        .then(function(proceed) {
            return proceed ? verifySaveChangesToStore() : false;
        })
        .then(function(proceed) {
            if (proceed) {
                newFile();
            }
        });
}
function btnOpenFileClick() {
    console.log("In btnOpenFileClick...");
    spVerifySaveChanges()
        .then(function(proceed) {
            //return ( proceed ? soVerifySaveChanges() : $.Deferred.resolve( false ) )
            //return ( proceed ? $.Deferred().resolve( true ) : $.Deferred().resolve( false ) )
            return proceed; // for now do this. need to go thru when Secure Object is ready
        })
        .then(function(proceed) {
            return proceed ? verifySaveChangesToStore() : false;
        })
        .then(function(proceed) {
            if (proceed) {
                // Modified to test function closure to class conversion
                selectFile.OpenDialog().then(openFile);
            }
        });
}

function btnSaveFileClick(e: any) {
    // TODO: Put explicit type
    console.log("In btnSaveFileClick...");

    switch ("#" + e.id) {
        case ID.BTN_SAVE_FILE: // "btnSaveFile":
            console.log( "-- save" );
            let fileName = mainVM.get("fileName");
            if (fileName != null) {
                showProgress();
                saveFile(fileName).always(hideProgress);
                break;
            }
        case ID.BTN_SAVE_FILE_AS: // "btnSaveFileAs":
            console.log("-- save file as");
            selectSaveAsFileName.OpenDialog()
                .then(function(fileName) {
                    showProgress();
                    return saveFile(fileName);
                })
                .always(hideProgress);
            break;
    }
}

// resolve(true) if discard changes or save successful
// resolve(false) if save failed or cancel selected
function verifySaveChangesToStore() {
    console.log("In verifySaveChangesToStore...");
    let dfd = $.Deferred();
    console.log(mainVM.get("hasChanges"));
    if (!mainVM.get("hasChanges")) {
        dfd.resolve(true);
    } else {
        let isNewFile = mainVM.get("fileName") ? false : true;
        let message = "Save changes to " + (isNewFile ? "NewFile" : mainVM.get("fileName")) + "?";
        $.when(showYesNoCancelDialog("Save changes?", message)).then(function(response) {
            console.log("-- Response is " + response);
            switch (response) {
                case 1: // save
                    let promise: any = isNewFile ? selectSaveAsFileName.OpenDialog() : $.Deferred().resolve();
                    // TODO: Need to check what exactly it does here and amend.
                    promise.then(saveFile).then(function(saveResult: any) {
                        dfd.resolve(saveResult);
                    });

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
function saveFile(fileName: string) {
    console.log("In saveFile...");
    console.log("-- File name: " + fileName);

    let data = fileName ? { fileName: fileName } : null;
    let dfd = $.Deferred();

    $.ajax({
        method: "POST",
        url: getActionUrl("SaveFile", "Admin"),
        data: data, //{ fileName: fileName } ,
        dataType: "json",
    } )
        .then( ( data: AjaxResponse ) => {
            if (data.Status == AjaxResponseStatus.Success) {
                if (fileName) {
                    mainVM.init();
                    mainVM.set("fileName", fileName);
                    setWindowTitle(fileName);
                } else {
                    (mainVM as any).setChange(false);
                }

                notifySuccess("File " + mainVM.get("fileName") + " saved successfully");
                dfd.resolve(true);
            } else {
                notifyError(data.Message);
                dfd.resolve(false);
            }
        },
        function(jqXHR: JQueryXHR, textStatus: string) {
            let msg = decipherJqXhrError(jqXHR, textStatus);
            notifyError("An error has occurred while saving file " + (fileName ? fileName : mainVM.get("fileName")) + ".<br/>" + "Error: " + msg);
            dfd.resolve(false);
        }
    );

    return dfd.promise();
}
function switchView(e: any) {
    console.log("In switchView...");
    switch (e.id) {
        case "btnShowSecurityPrincipals":
            soHide();
            spShow();
            break;
        case "btnShowSecureObjects":
            spHide();
            soShow();
            break;
        default:
            spHide();
            soHide();
    }
}

function setWindowTitle(fileName?: string) {
    document.title = originalWindowTitle + " " + fileName;
}

$(document).ready(function() {
    init();
    $("html").removeClass("no-fouc");
});

//function togglePanel(e) {
//    //alert( "togglepanel" )
//    //console.log( e )
//    console.log( this )
//    console.log( $(this).next().toggle())s
//}
export {
    btnOpenFileClick,
    btnNewFileClick,
    btnSaveFileClick,
    switchView,
    mainVM
};

export {
    spGetNameIconClass,
    spBtnNewClick,
    spBtnDeleteClick,
    spBtnSaveClick,
    spBtnDiscardClick,
    spBtnMemberOfAddClick,
    spBtnMembersAddClick,
    spMsMemberOfDataSource,
    spMsMembersDataSource,
    spLbMemberOfDataSource,
    spLbMembersDataSource,
    spGrdDataSourceChange
} from "./sp";
export {
    soTlDrop,
    soBtnNewClick,
    soBtnDeleteClick,
    soBtnExpandAllClick,
    soBtnCollapseAllClick,
    soBtnSaveClick,
    soBtnDiscardClick,
} from "./so";
