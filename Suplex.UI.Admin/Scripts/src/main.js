import * as ID from "./ids.js"
import { showNotification, getActionUrl, showYesNoCancelDialog } from "./utils"
import { setupSecurityPrincipals, showSecurityPrincipals, hideSecurityPrincipals, resetSecurityPrincipals, loadSecurityPrincipals, verifySaveChanges as spVerifySaveChanges } from "./sp"
import { setupSecureObjects, hideSecureObjects, showSecureObjects, resetSecureObjects, loadSecureObjectsTree } from "./so"

var suplexStore = {
    fileName: null,
    hasChanges: false,
    init: function () {
        this.fileName = null
        this.hasChanges = false
    },
    setChange: function (trueorfalse) {
        this.hasChanges = trueorfalse
    }    
}

// https://www.telerik.com/blogs/how-to-do-javascript-alerts-without-being-a-jerk
// create the widgets once, and store a reference to it so it can be used again and again
var selectFile = ( function () {
    var dfd
    var fileName

    var dsFileExplorer = new kendo.data.HierarchicalDataSource( {
        transport: {
            read: {
                url: getActionUrl( "GetDirectoryContents", "Admin" ),
                dataType: "json"
            }
        },
        schema: {
            model: {
                id: "Path",
                //hasChildren: "HasChildren"  
                //use a function to dynamically add an item/field to the node. https://stackoverflow.com/questions/13629373/kendo-ui-treeview-sprite-altering-template
                hasChildren: function ( node ) {
                    if ( node.Type == "File" )
                        node.spriteCssClass = "file"
                    else
                        node.spriteCssClass = "folder"
                    return node.HasChildren

                }
            }
        }
    } )

    var $dlgSelectFile = $( ID.DLG_SELECT_FILE )
    var k$dlgSelectFile = $dlgSelectFile.kendoDialog( {
        width: "400px",
        visible: false,
        title: "Open File",
        closable: true,
        modal: false,
        content: "<div id='tvSelectFile'></div>",
        open: function () {
            if ( dsFileExplorer.data().length == 0 )
                dsFileExplorer.read()
        },
        close: function () {
            dfd.resolve( fileName )
        },
        actions: [
            {
                text: 'OK',
                primary: true,
                action: function () {
                    var ok  = false
                    var selected = k$tvSelectFile.select()
                    var item = k$tvSelectFile.dataItem( selected )
                    if ( item ) {
                        if ( item.Type != "File" ) {
                            kendo.alert( "Select a file" )
                        }
                        else {
                            ok = true  // assume ok so dialog can be closed
                            fileName = item.Path
                        }
                    }
                    else {
                        kendo.alert( "Select a file" )
                    }
                    return ok
                }
            },
            { text: 'Cancel' },
            {
                text: 'Refresh',
                action: function () {
                    console.log( "Refreshing file explorer" )
                    dsFileExplorer.read()
                    return false
                }
            }
        ]
    } ).getKendoDialog()

    var $tvSelectFile = $( ID.TREEVIEW_SELECT_FILE )
    var k$tvSelectFile = $tvSelectFile.kendoTreeView( {
        autoBind: false,
        dataSource: dsFileExplorer,
        dataTextField: "Name"
    } ).getKendoTreeView()

    return function () {
        console.log("In selectFile...")
        dfd = $.Deferred()
        fileName = null
        k$dlgSelectFile.open()

        return dfd.promise()
    }
}() )


var getSaveAsPath = ( function () {
    var dfd
    var fileName

    var dsFileExplorer = new kendo.data.HierarchicalDataSource( {
        transport: {
            read: {
                url: getActionUrl( "GetDirectoryContents", "Admin" ),
                dataType: "json"
            }
        },
        schema: {
            model: {
                id: "Path",
                //hasChildren: "HasChildren"  
                //use a function to dynamically add an item/field to the node. https://stackoverflow.com/questions/13629373/kendo-ui-treeview-sprite-altering-template
                hasChildren: function ( node ) {
                    if ( node.Type == "File" )
                        node.spriteCssClass = "file"
                    else
                        node.spriteCssClass = "folder"
                    return node.HasChildren

                }
            }
        }
    } )

    var $dlgSaveFileAs = $( ID.DLG_SAVE_FILE_AS )
    var k$dlgSaveFileAs = $dlgSaveFileAs.kendoDialog( {
        width: "400px",
        visible: false,
        title: "Save As",
        closable: true,
        modal: false,
        content: "<div id='tvSaveFileAs'></div><div style='margin-top:20px'><label>File name </label>&npsp;&npsp;<input id='txtSaveFileAsPath' class='k-textbox' /><label>.splx</label></div>",
        open: function () {
            if ( dsFileExplorer.data().length == 0 )
                dsFileExplorer.read()
        },
        close: function () {
            dfd.resolve( fileName )
        },
        actions: [
            {
                text: 'OK', 
                primary: true,
                action: function () {
                    var ok = false
                    var selected = k$tvSaveFileAs.select()
                    var item = k$tvSaveFileAs.dataItem( selected )
                    // to do:
                    // if item is a file, get the folder name of the selected file
                    // combine folder name with file name found in the textbox
                    if ( item ) {
                        if ( $txtSaveFileAsPath.val().length != 0 ) {
                            ok = true
                            fileName = item.Path
                        }
                        else {
                            kendo.alert( "Enter a file name" )
                        }
                    }
                    else {
                        kendo.alert( "Select a file or folder" )
                    }
                    return ok
                }
            },
            { text: 'Cancel' },
            {
                text: 'Refresh',
                action: function () {
                    console.log( "Refreshing file explorer" )
                    dsFileExplorer.read()
                    return false
                }
            }
        ]
    } ).getKendoDialog()

    var $tvSaveFileAs = $( ID.TREEVIEW_SAVE_FILE_AS )
    var $txtSaveFileAsPath = $( ID.TXT_SAVE_FILE_AS_PATH )
    var k$tvSaveFileAs = $tvSaveFileAs.kendoTreeView( {
        autoBind: false,
        dataSource: dsFileExplorer,
        dataTextField: "Name",
        change: function ( e ) {
            console.log( this.select() )
            var selected = this.select()
            var item = this.dataItem( selected )
            if ( item )
                if ( item.Type == "File" ) {
                    // get the base name, minus extension, and populate the file name text box
                    var fileName = item.fileName
                    $txtSaveFileAsPath.val( fileName.substr( 0, x.lastIndexOf(',')) || fileName )
                }
        }
    } ).getKendoTreeView()

    return function () {
        console.log( "In getSaveAsPath..." )
        dfd = $.Deferred()
        fileName = null
        k$dlgSaveFileAs.open()

        return dfd.promise()
    }
}() )

function init() {

    setupWidgets()
    setupVariables()
    setupEventHandlers()

    //kendo.bind(document.body, mainVm)
    setupSecurityPrincipals()
    setupSecureObjects()

    // turn off autocomplete & autocorrect
    $( 'input' ).attr( 'autocomplete', 'off' );
    $( 'input' ).attr( 'autocorrect', 'off' );

    // default to this view    
    $( ID.BTN_SHOW_SECURITY_PRINCIPALS ).click()
}


function setupWidgets() {
}

function setupVariables() {

    //_k$tvFileExplorer = _$tvFileExplorer.data('kendoTreeView')
    //_k$dlgFileExplorer = _$dlgFileExplorer.data('kendoDialog') 

}

function setupEventHandlers() {
    $( ".accordion h2" ).click( function () {
        $( this ).next().toggle()
        $( this ).find( "span" ).toggleClass( "k-i-arrow-chevron-up k-i-arrow-chevron-down" )
    } )
}
function openFile( fileName ) {
    console.log( "In openFile..." )
    console.log( "File name: " + fileName )

    if ( !fileName ) return

    $.ajax({
        method: 'GET',
        url: getActionUrl("OpenFile", "Admin"),
        data: { 'fileName': fileName },
        dataType: 'json'
    } ).done( function ( data, textStatus, xhr) {
        suplexStore.init()
        suplexStore.fileName = fileName
        resetSecurityPrincipals()
        loadSecurityPrincipals()
        resetSecureObjects()
        loadSecureObjectsTree()
    } ).fail( function ( xhr, textStatus, errorThrown) {
        showNotification("There was a problem reading the file", "error")
    })
}

function newFile() {
    console.log("In newFile...")
    $.ajax( {
        method: 'POST',
        url: getActionUrl( "NewFile", "Admin" ),
        dataType: 'json'
    } ).done( function ( data, textStatus, xhr ) {
        if ( data.Status != "success" ) {
            showNotification( "Unable to initialize suplex store", "error" )
        }
        else {
            suplexStore.init()
            resetSecurityPrincipals()
            resetSecureObjects()
        }
        } ).fail( function ( xhr, textStatus, errorThrown ) {
        showNotification( "Unable to initialize suplex store", "error" )
        console.log( xhr )
    } )
}

function btnNewFileClick( e ) {
    console.log( "In btnNewFileClick..." )
    spVerifySaveChanges()
        .then( function ( proceed ) {
            //return ( proceed ? soVerifySaveChanges() : $.Deferred.resolve( false ) )
            return ( proceed ? $.Deferred().resolve( true ) : $.Deferred().resolve( false ) )
        } )
        .then( function ( proceed ) {
            return ( proceed ? verifySaveChangesToStore() : $.Deferred().resolve( false ) )
        } )
        .then( function ( proceed ) {
            if ( proceed ) {
                newFile().then( openFile )
            }
        } )
    /// end
    //if (verifySaveChangesToStore()) {
    //    $.ajax({
    //        async: false,
    //        method: 'POST',
    //        url: getActionUrl("NewFile", "Admin"),
    //        dataType: 'json'
    //    }).done(function (data, textStatus, xhr) {
    //        if (data.Status != "success") {
    //            showNotification("Unable to initialize suplex store", "error")
    //        }
    //        else {
    //            suplexStore.init()
    //            resetSecurityPrincipalsView()
    //            refreshSecurityPrincipalsGrid()

    //        }
    //    }).fail(function (xhr, textStatus, errorThrown) {
    //        showNotification("Unable to initialize suplex store", "error")
    //        console.log(xhr)
    //    })
    //}
}
function btnOpenFileClick( e ) {
    console.log("In btnOpenFileClick...")
    spVerifySaveChanges()
        .then( function ( proceed ) {
            //return ( proceed ? soVerifySaveChanges() : $.Deferred.resolve( false ) )
            return ( proceed ? $.Deferred().resolve( true ) : $.Deferred().resolve( false ) )
        } )
        .then( function ( proceed ) {
            return ( proceed ? verifySaveChangesToStore() : $.Deferred().resolve( false ) )
        })
        .then( function ( proceed ) {
            if ( proceed ) {
                selectFile().then( openFile )
            }
        } )
}

function btnSaveFileClick( e ) {
    console.log( "In btnSaveFileClick..." )

    switch ( e.id ) {
        case "": break
        case "btnSaveFile":
            console.log("in save file")
            if ( suplexStore.fileName != null ) {
                
            }
            // don't break, let it flow to save as
        case "btnSaveFileAs":
            // new file
            console.log("in save file as")
            getSaveAsPath().then( function ( fileName ) {
                console.log( fileName )
            } )
            break
    }
}

function verifySaveChangesToStore() {
    console.log("In verifySaveChangesToStore...")
    var dfd = $.Deferred()
    if ( !suplexStore.hasChanges ) {
        dfd.resolve( true )
    }
    else {
        var message = "Save changes to " + (suplexStore.fileName ? suplexStore.fileName : "file store") + "?"
        $.when( showYesNoCancelDialog( "Save changes?", message ) ).then( function ( response ) {
            if ( response ) {
                getSaveAsPath().then( function ( fileName ) {
                    console.log(fileName)
                } )
                // do the save here
                // for now return true
                dfd.resolve(true)
            }
        } )
    }

    return dfd.promise()
}

function switchView( e ) {
    console.log( "In switchView..." )
    switch ( e.id ) {
        case "btnShowSecurityPrincipals":
            hideSecureObjects()
            showSecurityPrincipals()
            break
        case "btnShowSecureObjects":
            hideSecurityPrincipals()
            showSecureObjects()
            break
        default:
            hideSecurityPrincipals()
            hideSecureObjects()
    }
}

$(document).ready(function () {
    init();
})

//function togglePanel(e) {
//    //alert( "togglepanel" )
//    //console.log( e )
//    console.log( this )
//    console.log( $(this).next().toggle())
//}
export { btnOpenFileClick, btnNewFileClick, btnSaveFileClick, switchView, suplexStore } 

export { getSecurityPrincipalIconClass, btnNewUserClick, btnNewGroupClick, btnSaveSecurityPrincipalClick, btnDiscardSecurityPrincipalClick, btnDeleteSecurityPrincipalClick } from "./sp"
export { tvSecureObjectsChange, btnNewSecureObjectClick, btnDeleteSecureObjectsClick, btnExpandAllSecureObjectsClick, btnCollapseAllSecureObjectsClick } from "./so"