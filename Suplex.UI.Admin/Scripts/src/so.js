import * as ID from "./ids.js"
import * as constants from "./constants"
import debounce from 'lodash/debounce'
import { mainVM } from "./main"
import { getActionUrl, decipherJqXhrError, dataSourceError, showYesNoCancelDialog, showYesNoDialog, blockUI, unblockUI, notifyError, notifyInfo, notifySuccess, isPowerOfTwo, showAlert } from "./utils"
import { SUCCESS } from "./constants";

var _$soView = $( ID.SO_VIEW )
var _$soTv = $( ID.SO_TREEVIEW )
var _$soSpltr = $( ID.SO_SPLITTER )

var _$soEditor = $( ID.SO_EDITOR )
var _$soEditorError = $( ID.SO_EDITOR_ERROR )
var _$soGrdDacl = $( ID.SO_GRD_DACL )
var _$soGrdSacl = $( ID.SO_GRD_SACL )

var _validator = null

var _k$soTv = null
var _k$soGrdDacl = null
var _k$soGrdSacl = null

var _auditTypes = []
var _rightTypes = []
var _rights = {}
var _secureObjectDefaults = {}

var dfdSecureObjectDefaults = $.get( getActionUrl( "GetSecureObjectDefaults", "Admin" ) )
    .done( function ( data ) {
        var arr = []
        _secureObjectDefaults = data
        soVM.editor.set( "secureObjectDefaults", _secureObjectDefaults )
    } )
    .fail( function ( jqXHR, textStatus, errorThrown ) {
        let msg = decipherJqXhrError( jqXHR, textStatus )
        notifyError( "There is a problem getting information from the server" + "<br/>" + msg )
    } )

var dfdAuditTypes = $.get( getActionUrl( "GetAuditTypes", "Admin" ) )
    .done( function ( data ) {
        _auditTypes = data
        soVM.editor.set( "auditTypes", _auditTypes )
    } )
    .fail( function ( jqXHR, textStatus, errorThrown ) {
        let msg = decipherJqXhrError( jqXHR, textStatus )
        notifyError( "There is a problem getting information from the server" + "<br/>" + msg )        
    } )
var dfdRights = $.get( getActionUrl( "GetRights", "Admin" ) )
    .done( function ( data ) {
        _rightTypes = []      
        _rights = {}
        $.each( data, function ( index, item ) {
            _rights[item.RightType] = _rights[item.RightType] || []
            _rights[item.RightType].push( item )
            if ( _rightTypes.indexOf( item.RightType ) < 0 ) {
                _rightTypes.push( item.RightType )
            }
        } )
    } )
    .fail( function ( jqXHR, textStatus, errorThrown ) {
        let msg = decipherJqXhrError( jqXHR, textStatus )
        notifyError( "There is a problem getting information from the server" + "<br/>" + msg )
    } )

// block UI to ensure data is available before user starts to use
blockUI
$.when( dfdAuditTypes, dfdRights, dfdSecureObjectDefaults ).always( unblockUI )

var _kDsTrustees = new kendo.data.DataSource( {
    transport: {
        read: {
            url: getActionUrl( "GetAllTrustees", "Admin" ),
            dataType: "json"
        }
    }
} )

var _kDsDacl = new kendo.data.DataSource( {
    data: [],
    schema: {
        model: {
            id: "UId", // this is a MUST in order for CRUD to work in Grid
            fields: {
                UId: { editable: false, nullable: true },
                TrusteeUId: {
                    type: "string",
                    validation: { 
                        required: true
                    }
                },
                RightType: {
                    type: "string",
                    validation: {
                        required: true,
                        righttypevalidation: validateRightType 
                    }
                },
                Right: {
                    defaultValue: [],
                    validation: {
                        required: true,
                        rightvalidation: validateRight
                    }
                },
                Allowed: {
                    type: "boolean",
                    defaultValue: function () {
                        return ( _secureObjectDefaults["DaclAllowed"] || false )
                    }
                },
                Inheritable: {
                    type: "boolean",
                    defaultValue: function () {
                        return ( _secureObjectDefaults["DaclInheritable"] || false )
                    }
                }
            }
        }
    }
} )

var _kDsSacl = new kendo.data.DataSource( {
    data: [],
    schema: {
        model: {
            id: "UId", // this is a MUST in order for CRUD to work in Grid
            fields: {
                UId: { editable: false, nullable: true },
                TrusteeUId: {
                    type: "string",
                    validation: {
                        required: true
                    }
                },
                RightType: {
                    type: "string",
                    validation: {
                        required: true,
                        righttypevalidation: validateRightType
                    }
                },
                Right: {
                    defaultValue: [],
                    validation: {
                        required: true,
                        rightvalidation: validateRight 
                    }
                },
                Allowed: {
                    type: "boolean",
                    defaultValue: function () {
                        return ( _secureObjectDefaults["SaclAllowed"] || false )
                    }
                },
                Denied: {
                    type: "boolean",
                    defaultValue: function () {
                        return ( _secureObjectDefaults["SaclDenied"] || false )
                    }
                },
                Inheritable: {
                    type: "boolean",
                    defaultValue: function () {
                        return ( _secureObjectDefaults["SaclInheritable"] || false )
                    }
                }
            }
        }
    }
} )

var _soEditorModel = kendo.data.Model.define( {
    id: "UId",
    fields: {
        UId: { editable: false, nullable: true },
        UniqueName: {
            type: "string", validation: { required: true },
        },
        ParentUId: { type: "string" },
        IsEnabled: { type: "boolean", defaultValue: function () { return ( typeof _secureObjectDefaults["IsEnabled"] === "boolean" ? _secureObjectDefaults["IsEnabled"] : false ) } },
        DaclAllowInherit: { type: "boolean", defaultValue: function () { return ( typeof _secureObjectDefaults["DaclAllowInherit"] === "boolean" ? _secureObjectDefaults["DaclAllowInherit"] : false ) } },
        SaclAllowInherit: { type: "boolean", defaultValue: function () { return ( typeof _secureObjectDefaults["SaclAllowInherit"] === "boolean" ? _secureObjectDefaults["SaclAllowInherit"] : false ) } },
        SaclAuditTypeFilter: { defaultValue: function () { return ( _secureObjectDefaults["SaclAuditTypeFilterArray"] || [] ) } },
        Dacl: [{}],
        Sacl: [{}]
    }
} )

// properties required at the point of binding the view to the ViewModel must be a concrete value
// if the property value depends on external factors and may not be available at the time of binding, 
// set it to a default value first.this will allow the binding to be successful
var soVM = new kendo.observable( {
    visible: false,
    selectedUId: null,
    editor: {       // fields here are used by the editor
        visible: false,
        hasChanges: false,
        hasError: false,
        model: new _soEditorModel(),    // matches the model from the server
        auditTypes: [],     // one time set by ajax call. use to display the audit type filter checkboxes
        daclAllowInheritTextColor: function () {
            if ( this.model.get( "DaclAllowInherit" ) ) {
                return ""
            }
            else {
                return "#f00"
            }
        },
        saclAllowInheritTextColor: function () {
            if ( this.model.get( "SaclAllowInherit" ) ) {
                return ""
            }
            else {
                return "#f00"
            }
        },
        reset: function ( showEditor ) {
            if ( showEditor == undefined ) {
                showEditor = false
            }
            if ( showEditor != this.get( "visible" ) ) {
                this.set( "visible", showEditor )
            }
            // this.set( "visible", false )
            this.set( "hasChanges", false )
            this.set( "hasError", false )
            this.set( "model", new _soEditorModel() )
        },
        setError: function ( trueOrFalse ) {
            if ( this.get( "hasError" ) == trueOrFalse ) return
            this.set( "hasError", trueOrFalse )
        },
        raiseChange: function ( e ) {       // bound to editor to set the hasChanges flag
            var that = this
            that.editor.set( "hasChanges", true )
        },
        setSaclAuditTypeFilterToDefault: function ( e ) {
            var that = this
            that.editor.model.set( "SaclAuditTypeFilter", _secureObjectDefaults["SaclAuditTypeFilterArray"] )
        },
        kDsDacl: _kDsDacl, // required so we display dacl item count on the editor
        kDsSacl: _kDsSacl, // required so we display sacl item count on the editor
        daclItemCount: function () {
            return ( this.get( "kDsDacl" ) ? this.get( "kDsDacl" ).total() : 0 )
        },
        saclItemCount: function () {
            return ( this.get( "kDsSacl" ) ? this.get( "kDsSacl" ).total() : 0 )
        },
        securityInheritanceState: function () {
            // returns default if default setting, else modified
            if ( ( this.model.get( "DaclAllowInherit" ) == _secureObjectDefaults["DaclAllowInherit"] ) &&
                ( this.model.get( "SaclAllowInherit" ) == _secureObjectDefaults["SaclAllowInherit"] ) &&
                this.saclAuditTypeFilterIsDefault() )
                return "Default"
            else
                return "Modified"
        },
        saclAuditTypeFilterIsDefault: function () {
            //var v = 0
            //var filterArray = this.model.get( "SaclAuditTypeFilter" )       // this is in int[] format
            //$.each( filterArray , function ( index, item ) {
            //    v |= item //parseInt(item)
            //} )
            //return ( v == _secureObjectDefaults["SaclAuditTypeFilter"] )
            return ( this.model.get( "SaclAuditTypeFilter" ).reduce( function ( result, itemVal ) { return ( result | itemVal ) }, 0 ) == _secureObjectDefaults["SaclAuditTypeFilter"] )
        }
    },
    secureObjectSelected: function () {
        return ( this.get( "selectedUId" ) != null )
    },
    reset: function () {
        // this.set( "visible", false )  // visibility determined by main.js
        this.set( "selectedUId", null )
        this.editor.reset()
    }
})
// functions to set view model fields
function setChange( trueorfalse ) {
    if ( soVM.editor.get( "hasChanges" ) == trueorfalse ) return
    soVM.editor.set( "hasChanges", trueorfalse )
}
function setError( trueorfalse ) {
    if ( soVM.editor.get( "hasError" ) == trueorfalse ) return
    soVM.editor.set( "hasError", trueorfalse )
}
function setSelectedUId( uId ) {
    if ( soVM.get( "selectedUId" ) != uId ) {
        soVM.set( "selectedUId", uId )
    }
}
export function setupSecureObjects() {
    kendo.bind( _$soView, soVM )

    setupWidgets()

    setupVariables()

    setupEventHandlers()

    resizeElements()

    resetSecureObjects()    // without this data wont show up on the treeview when adding item to the datasouce right after launch

}

function setupWidgets() {
    //https://demos.telerik.com/kendo-ui/grid/editing-custom
    //https://docs.telerik.com/kendo-ui/controls/data-management/grid/how-to/Templates/grid-with-checkbox-column
    //https://community.progress.com/community_groups/openedge_kendo_ui_builder/w/openedgekendouibuilder/2923.how-to-add-a-combo-box-or-a-dropdownlist-to-a-grid-in-a-custom-view
    _$soGrdDacl.kendoGrid( {
        dataSource: _kDsDacl, 
        columns: [
            { field: "TrusteeUId", title: "Group", width: "200px", editor: trusteeDropDownEditor, template: getTrusteeName },
            { field: "RightType", title: "Right Type", width: "150px", editor: rightTypeDropDownListEditor },
            { field: "Right", title: "Right", width: "200px", template: getRightAsString }, // editor is created in the grid edit event. We will bind the value manually
            { field: "Allowed", title: "Allowed", width: "80px", editor: boolEditor },
            { field: "Inheritable", title: "Inheritable", width: "90px", editor: boolEditor },
            {
                command: [
                    { name: "edit", text: { edit: "", update: "", cancel: "" } },
                    {
                        name: "customdelete",
                        text: "",
                        iconClass: "k-icon k-i-close",
                        click: function ( e ) {
                            e.preventDefault()
                            var tr = $( e.target ).closest( 'tr' )
                            var data = this.dataItem( tr )
                            $.when( showYesNoDialog( "Confirm Delete", "Are you sure you want to delete this permission record?" ) )
                                .then( function ( response ) {
                                    if ( response == 1 ) {  // ok
                                        _k$soGrdDacl.dataSource.remove( data )
                                        setChange( true )
                                    }
                                })

                        }
                    }]
            }
        ],
        toolbar: ["create"],
        editable: "inline",
        edit: function ( e ) {
            // edit event is triggered before the editor form is shown. By this time the editor UI elements are already bound to the model.            
            var model = e.model
            var container = e.container
            var rightContainer = container.find( "[data-container-for=Right]" )
            createRightCheckBoxList( rightContainer, model )
            // disable validateOnBlur. Validate only when the update button is checked. This is so that the error will not stop the right checkboxes 
            // from being displayed when there is a change in the right
            https://docs.telerik.com/kendo-ui/knowledge-base/grid-disable-validation-on-blur
            delete e.model._events.set;
           
        },
        save: function ( e ) {
            // can also do validation here
            // and use e.preventDefault() to stop the save
            if ( this.dataSource.hasChanges() ) {
                // dataSource.hasChanges() is true when
                // 1. data item dirty is true( so if you clicked edit and save without doing anything, dirty will be false) or 
                // 2. new item added
                // item delete has no effect on this flag
                setChange( true )
            }
        },
        remove: function ( e ) {    // not triggered when we use custom command
            setChange( true )
        }
    })

    _$soGrdSacl.kendoGrid( {
        dataSource: _kDsSacl,
        columns: [
            { field: "TrusteeUId", title: "Group", width: "200px", editor: trusteeDropDownEditor, template: getTrusteeName },
            { field: "RightType", title: "Right Type", width: "150px", editor: rightTypeDropDownListEditor },
            { field: "Right", title: "Right", width: "200px", template: getRightAsString }, // editor is created in the grid edit event. We will bind the value manually
            { field: "Allowed", title: "Success", width: "80px", editor: boolEditor },
            { field: "Denied", title: "Failure", width: "80px", editor: boolEditor },
            { field: "Inheritable", title: "Inheritable", width: "90px", editor: boolEditor },
            {
                command: [
                    { name: "edit", text: { edit: "", update: "", cancel: "" } },
                    {
                        name: "customdelete",
                        text: "",
                        iconClass: "k-icon k-i-close",
                        click: function ( e ) {
                            e.preventDefault()
                            var tr = $( e.target ).closest( 'tr' )
                            var data = this.dataItem( tr )
                            $.when( showYesNoDialog( "Confirm Delete", "Are you sure you want to delete this audit record?" ) )
                                .then( function ( response ) {
                                    if ( response == 1 ) {  // ok
                                        _k$soGrdSacl.dataSource.remove( data )
                                        setChange( true )
                                    }
                                } )

                        }
                    }]
            }
        ],
        toolbar: ["create"],
        editable: "inline",
        edit: function ( e ) {
            // edit event is triggered before the editor form is shown. By this time the editor UI elements are already bound to the model.            
            var model = e.model
            var container = e.container
            var rightContainer = container.find( "[data-container-for=Right]" )
            createRightCheckBoxList( rightContainer, model )
            // disable validateOnBlur. Validate only when the update button is checked. This is so that the error will not stop the right checkboxes 
            // from being displayed when there is a change in the right
            https://docs.telerik.com/kendo-ui/knowledge-base/grid-disable-validation-on-blur
            delete e.model._events.set;
        },
        save: function ( e ) {
            // can also do validation here
            // and use e.preventDefault() to stop the save
            if ( this.dataSource.hasChanges() ) {
                // dataSource.hasChanges() is true when
                // 1. data item dirty is true( so if you clicked edit and save without doing anything, dirty will be false) or 
                // 2. new item added
                // item delete has no effect on this flag
                setChange( true )
            }
        },
        remove: function ( e ) {    // won't work if we use custom command
            setChange( true )
        }
    } )

    $( ID.SO_TREEVIEW_MENU ).kendoContextMenu( {
        target: $( ID.SO_SPLITTER ).find( ".k-pane:first" ),
        filter: ".k-item .k-in, .wrapper",
        open: function ( e ) {
            var ele = $( e.target ) 
            var ctxMnu = $( e.item )
            if ( ele.hasClass( "wrapper" ) ) {
                ctxMnu.find( ".node-only" ).hide()
            }
            else {
                ctxMnu.find( ".node-only" ).show()
            }
        },
        select: function ( e ) {
            var target = $( e.target )
            switch ( e.item.id ) {
                case "soTvMnuNew":
                    verifySaveChanges().then( function ( proceed ) {

                        if ( proceed ) {
                            resetEditor( true )
                            if ( target.hasClass( "wrapper" ) ) {
                                // not a treeview node, so create a top level node
                            }
                            else {
                                var dataItem = _k$soTv.dataItem( target )
                                selectSecureObjectTreeNode( dataItem.UId ) // select the node pointed by the context menu
                                soVM.editor.model.set( "ParentUId", dataItem.UId )                                
                            }
                        }
                        else {

                        }
                    } )
                    break
                case "soTvMnuDelete":
                    var dataItem = _k$soTv.dataItem( target )

                    // need to incorporate verifysavechanges
                    _k$soTv.select( target )
                    _k$soTv.trigger( 'click' )
                    $( ID.SO_BTN_DELETE ).trigger( 'click' )

                    break
                case "soTvMnuExpand":
                    var node = ( target.hasClass( "wrapper" ) ) ? $() : target.closest( ".k-item" )
                    expandCollapseAll( true, node )
                    break
                case "soTvMnuCollapse":
                    var node = ( target.hasClass( "wrapper" ) ) ? $() : target.closest( ".k-item" )
                    expandCollapseAll( false, node )
                    break
                case "soTvMnuPreview":
                    break
                default:
                    break
            }
            // remove focus from node
            setTimeout( function () {
                target.removeClass( "k-state-focused" )
            } )
        }
    } )

    _validator = _$soEditor.kendoValidator( {
        validateOnBlur: false,
        validate: function ( e ) {
            $( "span.k-invalid-msg" ).hide()
        }
    } ).data( "kendoValidator" )

}
function setupVariables() {
    _k$soTv = _$soTv.data( 'kendoTreeView' )
    _k$soGrdDacl = _$soGrdDacl.data( 'kendoGrid' )
    _k$soGrdSacl = _$soGrdSacl.data( 'kendoGrid' )    
}
function setupEventHandlers() {
    $( window ).resize( debounce( resizeElements, 500 ) ).trigger( 'resize' )

    $( ID.SO_TREEVIEW ).on( 'click', '.k-item .k-in', soTvClick )
}

export function showSecureObjects() {
    if ( !soVM.get( "visible" ) )
        soVM.set( "visible", true )
}
export function hideSecureObjects() {
    if ( soVM.get( "visible" ) )
        soVM.set( "visible", false )
}
export function resetSecureObjects() {
    soVM.reset()
    //resetEditor( false )
    _k$soTv.dataSource.data([])
}
export function loadSecureObjectsTree() {
    _k$soTv.dataSource.read()
}
function resizeElements() {
    var top = 125  // height occupied above splitter
    var bottom = 25 // height occupied below splitter
    var height = $( window ).height() - ( top + bottom ) - 1  // to stop the body scrollbar from appearing
    height = ( height <= 0 ) ? 100 : height
    _$soSpltr.height( height )

    // var width = $( window ).width() - 
    _$soSpltr.data( 'kendoSplitter' ).resize()
}
export function soBtnExpandAllClick( e ) {
    // note: this only works when loadOnDemand is false
    var node = _k$soTv.select()
    expandCollapseAll( true, node )
}
export function soBtnCollapseAllClick( e ) {
    var node = _k$soTv.select()
    expandCollapseAll( false, node )
}
function expandCollapseAll( expand, node ) {
    if ( node.length == 0 ) {
        expand ? _k$soTv.expand( ".k-item" ) : _k$soTv.collapse( ".k-item" )
    }
    else {
        expand ? _k$soTv.expand( node.find( ".k-item" ).addBack() ) : _k$soTv.collapse( node.find( ".k-item" ).addBack() )
    } 
}
export function soTvDataBound( e ) {
}
export function soBtnNewClick( e ) {
    console.log( "In soBtnNewClick..." )
    verifySaveChanges().then( function ( proceed ) {
        if ( proceed ) {
            // go ahead and prepare the editor
            resetEditor( true )
            // if there is a selected node, set the parent of the model
            if ( "#" + e.id == ID.SO_BTN_NEW ) {
                soVM.editor.model.set( "ParentUId", soVM.get( "selectedUId" ) )
            }
        }
    } )
}
export function soBtnSaveClick( e ) {
    console.log( "In soBtnSaveClick..." )
    clearEditorErrors()
    if ( validateEditor() ) {
        $.when( blockUI )
            .then( saveSecureObject )
            .then( processSaveActionResponse )
            .then( function ( data ) { notifySuccess( "Secure Object " + data.Data.UniqueName + " saved successfully." ) } )
            .always( unblockUI )
    }
} 
function validateEditor() {
    console.log( "In validateEditor..." )
    var ok

    // make sure the 2 grids have exited edit mode
    if ( ( _k$soGrdDacl.table.find( 'tr.k-grid-edit-row' ).length > 0 ) || ( _k$soGrdSacl.table.find( 'tr.k-grid-edit-row' ).length > 0 ) ) {
        showAlert( "Alert", "<p style='text-align:center,width:400px;'>Complete the 'Permission' and 'Audit' sections first before you save.</p>" )
        ok = false
    }
    else {
        ok = _validator.validate()
        if ( !ok ) {
            var errors = _validator.errors();
            let msg = ""
            $( errors ).each( function () {
                msg = this + "<br/>"

            } )
            if ( msg.length > 0 ) {
                _$soEditorError.html( msg );
            }
            soVM.editor.setError( true )
        }
    }
    return ok
}
function saveSecureObject() {
    console.log( "In saveSecureObject..." )
    
    // clone the model
    var model = JSON.parse( JSON.stringify( soVM.editor.get("model") ) )
    // convert saclaudittypefilter back to a single number
    var auditTypeFilterVal = model.SaclAuditTypeFilter.reduce( function ( result, itemVal ) { return ( result | itemVal ) }, 0 )
    model.SaclAuditTypeFilter = auditTypeFilterVal
    model.Sacl =_kDsSacl.data() 
    model.Dacl = _kDsDacl.data()
    var dfd = $.Deferred()

    $.ajax( {
        method: 'POST',
        url: getActionUrl( "SaveSecureObject", "Admin" ),
        contentType: 'application/json',
        data: JSON.stringify( model ),
        dataType: 'json'
        } )
        .then( function ( data ) {
            if ( data.Status == constants.SUCCESS ) {
                transformData( data )
                dfd.resolve( data )
            }
            else {
                dfd.resolve( data )  // need to pass error message from the server to the UI
            }
        } )
        .fail( function ( jqXHR, textStatus, errorThrown ) {
            let msg = decipherJqXhrError( jqXHR, textStatus )
            notifyError( "There is a problem saving Secure Object." + "<br/>" + msg )
            dfd.reject()
        } )

    return dfd.promise()
}
function transformData( data ) {
    // convert SaclAuditTypeFilter to int[] so we can bind it to the editor
    // need to convert back before sending the model back to the server for update
    // another option:
    // - Use a new property to hold the value in int[].
    // - don't touch the existing property. bind the new property to the editor
    // - before save, update the field, and delete (use the delete command) the temporary property 
    var v = data.Data.SaclAuditTypeFilter
    var arr = []
    $.each( _auditTypes, function ( index, item ) {
        if ( ( v & item.Id ) == item.Id ) {
            arr.push( item.Id )
        }
    } )
    data.Data.SaclAuditTypeFilter = arr
    // return arr
}

function processSaveActionResponse( data ) {
    console.log( "In processSaveActionResponse..." )
    var dfd = $.Deferred()

    if ( data.Status == constants.SUCCESS ) {
        mainVM.setChange( true )

        var model = null
        if ( data.Data ) {
            model = data.Data
        }        
        if ( model ) {
            setChange( false )
            populateEditor( data )
            // update tree
            // select updated node & expand parents

           
                // add/update just the root node. then sort
                $.get( getActionUrl( "GetSecureObjectTreeItem", "Admin" ), { 'uId': data.Data.UId } )
                    .then( ( updatedItem ) => {
                        
                        var dsItem = _k$soTv.dataSource.get( updatedItem.UId )

                        if ( typeof dsItem == "undefined" ) {
                            if ( updatedItem.ParentUId == null ) {
                                // append as root node
                                _k$soTv.append( {
                                    UId: updatedItem.UId,
                                    UniqueName: updatedItem.UniqueName,
                                    IsEnabled: updatedItem.IsEnabled,
                                    ParentUId: updatedItem.ParentUId,
                                    HasChildren: updatedItem.HasChildren
                                } )
                                // sort root nodes, doesn't sort child nodes
                                // _k$soTv.dataSource.sort()   // root level sorting will use the sort configuration
                            }
                            else {
                                // append as a child of some node
                                var dsItem = _k$soTv.dataSource.get( updatedItem.ParentUId )
                                var parentEle = _k$soTv.findByUid( dsItem.uid )
                                _k$soTv.append( {
                                    UId: updatedItem.UId,
                                    UniqueName: updatedItem.UniqueName,
                                    IsEnabled: updatedItem.IsEnabled,
                                    ParentUId: updatedItem.ParentUId,
                                    HasChildren: updatedItem.HasChildren
                                }, parentEle )
                                // sort that specific level only
                                dsItem.children.sort( { field: "UniqueName", dir: "asc" })
                            }

                        }
                        else {
                            // existing node, just update
                            dsItem.set( "UniqueName", updatedItem.UniqueName )
                            dsItem.set( "IsEnabled", updatedItem.IsEnabled )
                            dsItem.set( "ParentUId", updatedItem.ParentUId )
                            dsItem.set( "HasChildren", updatedItem.HasChildren )
                        }
                        
                        selectSecureObjectTreeNode( data.Data.UId )
                        mainVM.setChange( true )
                        dfd.resolve( data )
                    } )
                    .fail( () => { dfd.reject( data ) })  // should notify error
            
            
            //$.get( getActionUrl( "GetSecureObjectTreeItem", "Admin" ), { 'uId': data.Data.UId } )
                
            //    .done( function ( updatedItem ) {
                    
            //        var dsItem = _k$soTv.dataSource.get( data.Data.UId )
            //        if ( typeof dsItem !== "undefined" ) {
            //            dsItem.set( "UniqueName", updatedItem.UniqueName )
            //            dsItem.set( "IsEnabled", updatedItem.IsEnabled )
            //            dsItem.set( "ParentUId", updatedItem.ParentUId )
            //            dsItem.set( "HasChildren", updatedItem.HasChildren )
                        
            //        }
            //        else if ( updatedItem.ParentUId == null ) {
            //            // top node
            //            _k$soTv.append( {
            //                UId: updatedItem.UId,
            //                UniqueName: updatedItem.UniqueName,
            //                IsEnabled: updatedItem.IsEnabled,
            //                ParentUId: updatedItem.ParentUId,
            //                HasChildren: updatedItem.HasChildren
            //            } )
            //        }
            //        else {
            //            //var dsItem = _k$soTv.dataSource.get( updatedItem.ParentUId )
            //            //var parentEle = _k$soTv.findByUid(dsItem.uid)
            //            //_k$soTv.append( {
            //            //    UId: updatedItem.UId,
            //            //    UniqueName: updatedItem.UniqueName,
            //            //    IsEnabled: updatedItem.IsEnabled,
            //            //    ParentUId: updatedItem.ParentUId,
            //            //    HasChildren: updatedItem.HasChildren
            //            //},  parentEle )

            //            //
                        

            //            //
            //            //var dsItem = _k$soTv.dataSource.get( updatedItem.ParentUId )
            //            //if ( typeof dsItem !== "undefined" ) {
            //            //    dsItem.append( {
            //            //        UId: updatedItem.UId,
            //            //        UniqueName: updatedItem.UniqueName,
            //            //        IsEnabled: updatedItem.IsEnabled,
            //            //        ParentUId: updatedItem.ParentUId,
            //            //        HasChildren: updatedItem.HasChildren
            //            //    } )
            //            //}
            //        }
            //        selectSecureObjectTreeNode( updatedItem.UId )
            //        dfd.resolve( data )
            //    })
        }
    }
    else {
        if ( data.ValidationErrors ) {
            if ( _$soEditorError ) {
                let msg = ""
                $( data.ValidationErrors ).each( function () {
                    msg += this + "<br/>"
                } )
                if ( msg.length > 0 ) {
                    _$soEditorError.html( msg )
                }
            }
            setError( true )
        }
        notifyError( data.Message )
        dfd.reject( data )
    }
    return dfd.promise()

}

//function expandSecureObjectTreeParent( nodeElement ) {
//    var parent = _k$soTv.parent( nodeElement );
//    while ( parent && parent.length > 0 ) {
//        _k$soTv.expand( parent );
//        parent = _k$soTv.parent( parent );
//    }
//}
export function soBtnDeleteClick( e ) {
    // get the selected item
    var itemToDelete = _k$soTv.dataItem( _k$soTv.select() ) 
    if ( !itemToDelete )
        return

    $.when( showYesNoDialog( "Confirm Delete", "Are you sure you want to delete the selected Secure Object and all its child items?" ) )
        .then( function ( response ) {
            if ( response == 1 ) {  // ok
                $.when( blockUI )
                    .then( function () { return deleteSecureObject( itemToDelete ) } )
                    .then( function ( data ) { return processDeleteActionResponse( data, itemToDelete ) } )   // if success: resolve(), else reject() 
                    .then( function () { notifySuccess( "Secure Object " + itemToDelete.UniqueName + " deleted successfully." ) } )
                    .always( unblockUI )
            }
        } )
}
function deleteSecureObject( itemToDelete ) {

    var dfd = $.Deferred()
    $.post( getActionUrl( "DeleteSecureObject", "Admin" ), { 'uId': itemToDelete.UId } )
        .then( function ( data ) {
            dfd.resolve( data )
        } )
        .fail( function ( jqXHR, textStatus, errorThrown ) {
            let msg = decipherJqXhrError( jqXHR, textStatus )
            notifyError( "There is a problem deleting Secure Object." + "<br/>" + msg )
            dfd.reject()
        } )

    return dfd.promise()
}
function processDeleteActionResponse( data, itemToDelete ) {
    if ( data.Status == constants.SUCCESS ) {
        mainVM.setChange( true )
        resetEditor()
        // remove item from tree
        var dataItem = _k$soTv.dataSource.get( itemToDelete.UId )
        _k$soTv.dataSource.remove( dataItem )
        setSelectedUId( null )
        //soVM.set( "selectedUId", null )

        // check what happens to the selected item? the selectedUId in the VM
        return $.Deferred().resolve().promise()

    }
    else {
        notifyError( data.Message )
        return $.Deferred().reject().promise()
    }
}
export function soBtnDiscardClick( e ) {
    console.log( "In soBtnDiscardClick..." )

    verifySaveChanges().then( function ( proceed ) {
        if ( proceed ) {
            resetEditor( false )
        }
    } )

}

// use click event and (MUST) leave treeview change and select methods empty
// too difficult to manage/control the events
function soTvClick( e ) {
    // this event comes after treeview select and change events
    console.log( "In soTvClick..." )
    var selectedItem = _k$soTv.dataItem( _k$soTv.select() ) 

    if ( !selectedItem ) {
        return
    }
    if ( soVM.editor.model.get( "UId" ) == selectedItem.UId ) {
        return
    }

    verifySaveChanges().then( function ( proceed ) {
        console.log( "-- " + proceed )
        if ( proceed ) {
            selectSecureObjectTreeNode( selectedItem.UId )
            resetEditor( true )

            var name = selectedItem.UniqueName
            $.when( _kDsTrustees.read(), getSecureObject( selectedItem.UId ) )
                .done( function ( arg1, arg2 ) {
                    //var data = arg2[0]
                    var data = arg2
                    populateEditor( data )
                } )
                .fail( function () {
                } )
        }
        else {
            // make prev node the selected node
            selectSecureObjectTreeNode()
        }
    } )
}
export function soTvDrag( e ) {
    // disallow if dropping to the same parent
    var srcParent = this.dataItem( this.parent( e.sourceNode ) )
    if ( e.statusClass == "i-plus" ) {
        var tgtParent = this.dataItem( e.dropTarget )
        if ( srcParent == tgtParent ) {
            e.setStatusClass( "k-i-cancel" )
            return
        }
    }
    else if ( e.statusClass.indexOf( "insert" ) >= 0 ) {
        var tgtParent = this.dataItem( this.parent( ( e.dropTarget ) ) )
        if ( srcParent == tgtParent ) {
            e.setStatusClass( "k-i-cancel" )
            return
        }
    }
}
export function soTvDrop( e ) {
    // at this stage, the node is not yet registered with the new destination. 
    if ( !e.valid ) return

    // need to provide copy node functionality
    // test if it is a move or copy
    if ( e.originalEvent.ctrlKey ) {
        console.log( "copy node" )
    }
    else {
        console.log( "move node" )
    }
    

    // update server
    var tree = e.sender  // this
    var sourceItem = tree.dataItem( e.sourceNode )
    var destinationItem = tree.dataItem( e.destinationNode )
    var position = e.dropPosition
    var parentItem = destinationItem
    if ( position != "over" ) {
        parentItem = parentItem.parentNode()
    }
    var sourceNode = e.sourceNode
    var destinationNode = $( e.destinationNode )
    e.preventDefault()      // handle the move manually after a successful update on the server

    $.ajax( {
        url: getActionUrl( "UpdateSecureObjectParent", "Admin" ),
        type: "POST",
        data: {
            uId: sourceItem.id,
            parentUId: parentItem ? parentItem.id : null
        }
    } ).then( function ( data ) {
        var dfd = $.Deferred()
        if ( data.Status == SUCCESS ) {
            sourceItem.set( "ParentUId", parentItem ? parentItem.id : null )
            if ( position == "over" ) {
                tree.append( sourceNode, destinationNode )
            }
            else {
                tree.insertAfter( sourceNode, destinationNode )    // it doesn't matter whether insertAfter or insertBefore. We are going to sort it
            }
            // sort
            //var tree = e.sender
            var dataSource = tree.dataSource
            setTimeout( function () {
                //sortSecureObjectTree( dataSource.view() ) // this one sorts the whole tree
                sortSecureObjectTreeNode( parentItem )
            }, 0 )

            mainVM.setChange( true )
            dfd.resolve()
        }
        else {
            dfd.reject()
        }
        return dfd.promise()
    } ).fail( function () { 
        e.setValid( false )
        notifyError( "An error has occurred while updating parent of Secure Object" )
    } )

    // sort
    //var tree = e.sender
    //var dataSource = tree.dataSource
    //setTimeout( function () {
    //    //sortSecureObjectTree( dataSource.view() ) // this one sorts the whole tree
    //    sortSecureObjectTreeNode(parent)
    //}, 0 );
}
function sortSecureObjectTreeNode( parentNode ) {
    if ( parentNode ) {
        parentNode.children.sort( { field: "UniqueName", dir: "asc" } )
    }
    else { // looks like it is smart enough to use the sort config
    }
}
// sorts the whole tree
//function sortSecureObjectTree( items ) {
//    for ( var i = 0; i < items.length; i++ ) {
//        if ( items[i].hasChildren ) {
//            items[i].children.sort( { field: "UniqueName", dir: "asc" } );
//            sortSecureObjectTreeNode( items[i].children.view() );
//        }
//    }
//}
function selectSecureObjectTreeNode( uId ) {

    if ( ! uId ) {  // if not provided take from view model
        uId = soVM.get( "selectedUId" )
    }

    var dataItem = _k$soTv.dataSource.get( uId )
    if ( dataItem ) {
        _k$soTv.expandTo( dataItem )
        var nodeElement = _k$soTv.findByUid( dataItem.uid )
        if ( nodeElement ) {
            _k$soTv.select( nodeElement )  // cannot use model set("selected", true) as this will not unset previous selection
        }
    }
    setSelectedUId( dataItem.UId )
}

function getSecureObject(uId) {
    var dfd = $.Deferred()

    $.get( getActionUrl( "GetSecureObjectByUId", "Admin" ), { 'uId': uId } )
        .then( function ( data ) {
            if ( data.Status == constants.SUCCESS ) {
                transformData( data )
                dfd.resolve( data )
            }
            else {
                notifyError( "There is a problem retrieving Secure Object")
                dfd.reject( data )
            }
        }, function ( jqXHR, textStatus, errorThrown ) {
            let msg = decipherJqXhrError( jqXHR, textStatus )
            notifyError( "There is a problem retrieving Secure Object." + "<br/>" + msg )
            dfd.reject( )

        } )
    return dfd.promise()
}
function resetEditor( showEditor ) {
    soVM.editor.reset( showEditor )
    clearEditorErrors()
    _k$soGrdDacl.dataSource.data( [] )
    _k$soGrdSacl.dataSource.data( [] )
}
function clearEditorErrors() {
    _$soEditorError.empty()    
    soVM.editor.setError( false )
}
function populateEditor( data ) {
    console.log( "In populateEditor..." )
    if ( data ) {
        soVM.editor.set( "model", data.Data )
        _k$soGrdDacl.dataSource.data( data.Data.Dacl )
        _k$soGrdSacl.dataSource.data( data.Data.Sacl )
    }
}
// not sure to use this or the datasource
function getAllTrustees() {

    var dfd = $.Deferred()

    $.get( getActionUrl( "GetAllTrustees", "Admin" ) )
        .done( function ( data ) {
            _allTrustees = data
            dfd.resolve()
        } )
        .fail( function ( jqXHR, textStatus, errorThrown ) {
            let msg = decipherJqXhrError( jqXHR, textStatus )
            notifyError( "There is a problem retrieving trustees" + "<br/>" + msg )
            dfd.reject()
        } )

    return dfd.promise()
}
// ddl used inside dacl, sacl grid
function trusteeDropDownEditor( container, options ) {
    
    //$( '<input name="' + options.field + '" data-bind="value:' + options.field + '" required="required"/>' )
    $( '<input name="' + options.field + '" data-bind="value:' + options.field + '" required="required"/>' )
        .appendTo( container )
        .kendoDropDownList( {
            dataTextField: "Name",
            dataValueField: "UId",
            valuePrimitive: true,
            dataSource: {   
                dataType: "json",
                transport: {
                    read: getActionUrl("GetAllTrustees", "Admin")
                }
            }
        } )
    $( '<span class="k-invalid-msg" data-for="' + options.field + '"></span>' ).appendTo( container )
}
function getTrusteeName( dataItem ) {
    if ( dataItem.TrusteeUId == null ) return ""

    _kDsTrustees.filter( { field: "UId", operation: "eq", value: dataItem.TrusteeUId } )
    var view = _kDsTrustees.view()
    if ( view.length == 0 ) return ""
    var name = view[0].Name
    _kDsTrustees.filter( {} )  // clear filter
    return kendo.htmlEncode( name )
}

function boolEditor( container, options ) {
    var guid = kendo.guid()
    $( '<input class="k-checkbox" id="' + guid + '" type="checkbox" name="' + options.field + '" data-type="boolean" data-bind="checked:' + options.field + '">' ).appendTo( container );
    $( '<label class="k-checkbox-label" for="' + guid + '">&#8203;</label>' ).appendTo( container );
}

function rightTypeDropDownListEditor( container, options ) {
    console.log("In rightTypeDropDownListEditor...")
    //var guid = kendo.guid()
    // options.model --> returns the row data item. to access a field, use options.model.<fieldname>    
    
    $( '<input data-bind="value:' + options.field + '" name="' + options.field + '" required="required" />' )
        .appendTo( container )
        .kendoDropDownList( {
            dataSource: _rightTypes,
            change: function ( e ) {
                options.model.set( "Right", 0 )
                
                var rightContainer = container.closest( 'tr.k-grid-edit-row' ).find( '[data-container-for=Right]' )
                
                createRightCheckBoxList( rightContainer, options.model )
                kendo.bind( rightContainer, options.model )
            }
        } )
    $( '<span class="k-invalid-msg" data-for="' + options.field + '"></span>' ).appendTo( container )

}

function createRightCheckBoxList( container, model ) {

    container.empty()
    if ( model.RightType == "" ) return

    var fieldName = "Right"
    var rightsArr = _rights[model.RightType]

    var ele = '<ul class="gridEditor">'
    $.each( rightsArr, function ( index, item ) {
        ele += '<li><input type="checkbox" class="k-checkbox" name="' + fieldName + '" id="' + fieldName + item.RightId + '" value="' + item.RightId + '" ' + ( ( ( model.Right & item.RightId ) == item.RightId ) ? "checked" : "" ) +  ' /><label class="k-checkbox-label" for="' + fieldName + item.RightId + '" >' + item.RightName + '</label></li>'
    } )
    ele += '</ul>'
    ele += '<span class="k-invalid-msg" data-for="' + fieldName + '"></span>'
    $( ele ).appendTo( container )

    // bind to click event - don't bind to change as we don't want the handler to be called multiple times for each checkbox that is programatically checked/unchecked
    // when auto-checking, use .prop("checked", trueorfalse). don't use .trigger('click') as it will cause the click handler to be executed for every checkbox that is checked
    container.find( ".k-checkbox" ).bind('click', function ( e ) {
        var cb = $(e.target)
        var bitFlag1 = parseInt( cb.val() )
        var isCompositeValue = !isPowerOfTwo( bitFlag1 )
        if ( cb.prop( "checked" ) ) {
            if ( isCompositeValue ) {
                // loop thru all unchecked checkboxes and see if we need to check them
                container.find( "input:checkbox:not(:checked)" ).each( function ( index ) {
                    var bitFlag2 = parseInt( $( this ).val() )
                    if ( ( bitFlag1 & bitFlag2 ) == bitFlag2 ) {
                        $( this ).prop( 'checked', true )  // fire change(). without it kendo checkboxes will not be checked. also change() will keep binding in sync
                        //$( this ).trigger( "click" )  // dont use this. we dont want the handler to be called repeatedly
                    }
                } )
            }
        }
        else {
            if ( !isCompositeValue ) {
                // do nothing if the value unchecked is a composite value
                // loop thru all checked checkboxes and see which ones to uncheck
                container.find( "input:checked" ).each( function ( index ) {
                    var bitFlag2 = parseInt( $( this ).val() )
                    if ( ( bitFlag1 & bitFlag2 ) == bitFlag1 ) {
                        $( this ).prop( 'checked', false )
                        // $( this ).trigger( 'click' )
                    }
                } )

            }
        }
        // now update the model
        var newRightVal = 0
        container.find( "input:checked" ).each( function ( index ) {
            newRightVal |= $(this).val()
        } )
        if ( newRightVal != model.Right ) {
            model.set("Right", newRightVal)
        }
    } ) 
}

function getRightAsString( dataItem ) {
    var rightVal = dataItem.Right
    var allRightsArr = _rights[dataItem.RightType]
    var rightArr = []
    while ( rightVal > 0 ) {
        $.each( allRightsArr, function ( index, item ) {
            if ( ( rightVal & item.RightId ) == item.RightId ) {
                rightArr.push( item.RightName )
                rightVal ^= item.RightId
            }
            if ( rightVal <= 0 ) {
                return false    // break out of $.each() loop
            }
        } )
    }
    return rightArr.join(", ")
}
function validateRight( input ) {
    if ( input.is( '[name="Right"]' ) ) {
        if ( input.closest( 'td' ).find( 'input[type=checkbox]:checked' ).length == 0 ) {
            input.attr( "data-rightvalidation-msg", "Select at least 1 right" )
            return false
        }
        else {
            return true
        }
    }
    return true
}
function validateRightType( input ) {
    if ( input.is( '[name="RightType"]' ) ) {
        // right + trusteeuid must be unique
        //to get the row dataItem for inline editing
        var row = input.closest( "tr" );
        var grid = row.closest( "[data-role=grid]" ).data( "kendoGrid" )
        var dataItem = grid.dataItem( row )

        var data = grid.dataSource.data()
        var ok = true
        // this method of checking for unique trusteeUId + righttype only works well when following criterias are met
        // 1. grid is using inline editing mode
        // 2. validator's validateonblur set to false. We had bind a custom validator to the grid as grid's default validator has validateonblur = true

        // Allowing validateonblur causes too many issues
        // - when you tab out of righttype and there is an error, the checkboxes in the right column is not refreshed. 
        //   if the problem is with trustee, and you select a different one, the content in Right column will still not be refreshed
        // - checking across columns is also harder. We can't rely on the datasource (like what we do here). if a field is in error, the value is not written to the datasource.
        //   the value has to be retrieved from the input element

        for ( var i = 0; i < data.length; i++ ) {
            // not we are comparing "uid"
            if ( data[i].uid != dataItem.uid && data[i].TrusteeUId == dataItem.TrusteeUId && data[i].RightType == input.val() ) {
                input.attr( "data-righttypevalidation-msg", "Group / Right Type<br/>combination must be<br/>unique" )
                ok = false
                break
            }
        }
        
        return ok
    }
    else
        return true
}
export function verifySaveChanges() {
    console.log( "In verifySaveChanges..." )
    var dfd = $.Deferred()
    if ( !soVM.editor.get( "hasChanges" ) ) {
        dfd.resolve( true )
    }
    else {
        $.when( showYesNoCancelDialog( "Save changes", "Save changes to Secure Object " + soVM.editor.model.get( 'UniqueName' ) + "?" ) ).then( function ( response ) {
            switch ( response ) {

                case 1:  // go ahead and save
                    clearEditorErrors()
                    if ( validateEditor() ) {
                        $.when( blockUI )
                            .then( saveSecureObject )
                            .then( processSaveActionResponse )
                            .then( function ( data ) {
                                notifySuccess( "Secure Object " + data.Data.UniqueName + " saved successfully." )
                                dfd.resolve( true )
                            } )
                            .fail( function () {
                                dfd.resolve( false )
                            } )
                            .always( unblockUI )
                    }
                    else {
                        // failed client validation
                        notifyError( "Please correct the error(s) on the form first." )
                        dfd.resolve( true )
                    }
                    break
                case 2: // discard changes and continue
                    dfd.resolve( true )
                    break
                case 3: // cancel action
                    dfd.resolve( false )
                    break
                default:
                    dfd.resolve( false )
                    break
            }
        } )
    }

    return dfd.promise()
}

function clearEditorErrors() {
    _$soEditorError.empty()
    soVM.editor.setError( false )
}
