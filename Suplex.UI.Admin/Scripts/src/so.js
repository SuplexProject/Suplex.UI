import * as ID from "./ids.js"
import * as constants from "./constants"
import debounce from 'lodash/debounce'
import { mainVM } from "./main"
import { getActionUrl, decipherJqXhrError, dataSourceError, showYesNoCancelDialog, showYesNoDialog, blockUI, unblockUI, notifyError, notifyInfo, notifySuccess, isPowerOfTwo } from "./utils"

var _$soView = $( ID.SO_VIEW )
var _$soTv = $( ID.SO_TREEVIEW )
var _$soSpltr = $( ID.SO_SPLITTER )

var _$soEditor = $( ID.SO_EDITOR )
var _$soEditorError = $( ID.SO_EDITOR_ERROR )
var _$soGrdDacl = $( ID.SO_GRD_DACL )
var _$soGrdSacl = $( ID.SO_GRD_SACL )

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
                    validation: { required: true }
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
        UId: { editable: false },
        UniqueName: {
            type: "string", validation: { required: true },
        },
        IsEnabled: { type: "boolean", defaultValue: function () { return ( _secureObjectDefaults["IsEnabled"] || false ) } },
        ParentUId: { type: "string" },
        SaclAuditTypeFilter: { defaultValue: function () { return ( _secureObjectDefaults["SaclAuditTypeFilterArray"] || [] ) } },
        DaclAllowInherit: { type: "boolean", defaultValue: function () { return ( _secureObjectDefaults["DaclAllowInherit"] || false ) } },
        SaclAllowInherit: { type: "boolean", defaultValue: function () { return ( _secureObjectDefaults["SaclAllowInherit"] || false ) } },
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
                //( this.model.get( "SaclAuditTypeFilter" ) == _secureObjectDefaults["SaclAuditTypeFilter"] ) )
                ( this.model.get( "SaclAuditTypeFilter" ).reduce( function ( result, itemVal ) { return ( result | itemVal ) }, 0 ) == _secureObjectDefaults["SaclAuditTypeFilter"] ) )
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

function setChange( trueorfalse ) {
    if ( soVM.editor.get( "hasChanges" ) == trueorfalse ) return
    soVM.editor.set( "hasChanges", trueorfalse )
}

export function setupSecureObjects() {
    kendo.bind( _$soView, soVM )

    setupWidgets()

    setupVariables()

    setupEventHandlers()    
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
            { command: [ { name: "edit", text: { edit: "", update: "", cancel: "" } }, { name: "destroy", text: "" } ] }
        ],
        toolbar: ["create"],
        editable: "inline",
        edit: function ( e ) {
            // edit event is triggered before the editor form is shown. By this time the editor UI elements are already bound to the model.            
            var model = e.model
            var container = e.container
            var rightContainer = container.find( "[data-container-for=Right]" )
            createRightCheckBoxList( rightContainer, model )
            // override default grid validator
            // https://stackoverflow.com/questions/45498601/conditional-and-custom-validation-on-add-edit-form-fields-when-using-kendo-gri?rq=1
           
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
        remove: function ( e ) {
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
            { command: [{ name: "edit", text: { edit: "", update: "", cancel: "" } }, { name: "destroy", text: "" }] }
        ],
        toolbar: ["create"],
        editable: "inline",
        edit: function ( e ) {
            // edit event is triggered before the editor form is shown. By this time the editor UI elements are already bound to the model.            
            var model = e.model
            var container = e.container
            var rightContainer = container.find( "[data-container-for=Right]" )
            createRightCheckBoxList( rightContainer, model )
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
        remove: function ( e ) {
            setChange( true )
        }
    } )
    
    
}
function setupVariables() {
    _k$soTv = _$soTv.data( 'kendoTreeView' )
    _k$soGrdDacl = _$soGrdDacl.data( 'kendoGrid' )
    _k$soGrdSacl = _$soGrdSacl.data( 'kendoGrid' )
}
function setupEventHandlers() {
    $( window ).resize( debounce( resizeSplitter, 500 ) ) 
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
function resizeSplitter() {
    console.log( "In resizeSplitter..." )
    var top = 125  // height occupied above splitter
    var bottom = 25 // height occupied below splitter
    var height = $( window ).height() - ( top + bottom )
    height = ( height <= 0 ) ? 100 : height
    _$soSpltr.height( height )

    // var width = $( window ).width() - 
    _$soSpltr.data( 'kendoSplitter' ).resize()
}
export function soBtnExpandAllClick( e ) {
    _k$soTv.expand( ".k-item" );
}
export function soBtnCollapseAllClick( e ) {
    _k$soTv.collapse( ".k-item" );
}
export function soBtnNewClick( e ) {
    console.log( "In soBtnNewClick..." )
    verifySaveChanges().then( function ( proceed ) {
        if ( proceed ) {
            // go ahead and prepare the editor
            resetEditor( true )
            //$.get(getActionUrl("GetNewSecureObject","Admin"))
            //    .done( function ( data ) {
            //        if ( data.Status == constants.SUCCESS ) {
            //            populateEditor( data )
            //        }
            //        else {
            //            notifyError( "Error retrieving information for new secure object" )
            //        }
            //    } )
            //    .fail( function ( jqXHR, textStatus, errorThrown ) {
            //        var errorMsg = decipherJqXhrError( jqXHR, textStatus )
            //        notifyError( errorMsg )
            //    } )
        }
    } )
}
export function soBtnDeleteClick( e ) {

}
export function soBtnDiscardClick( e ) {
    console.log( "In soBtnDiscardClick..." )

    //verifySaveChanges().then( function ( proceed ) {
    //    if ( proceed ) {
    //        resetEditor( false )
    //    }
    //} )

}
export function soTvChange( e ) {
    console.log( "In soTvChange..." )
    var selectedItem = _k$soTv.dataItem( _k$soTv.select() ) 
    console.log( selectedItem )

    if ( !selectedItem ) return

    if ( ( soVM.get( "selectedUId" ) == selectedItem.UId ) && ( selectedItem.UId == soVM.editor.model.get( "UId" ) ) ) {
        return
    }
    // to insert verifysavechanges code

    resetEditor( true )
    soVM.set( "selectedUId", selectedItem.UId )
    var name = selectedItem.UniqueName
    $.when( _kDsTrustees.read(), $.get( getActionUrl( "GetSecureObjectByUId", "Admin" ), { 'uId': selectedItem.UId } ) )
        .done( function ( arg1, arg2 ) {
            var data = arg2[0]
            if ( data.Status == constants.SUCCESS ) {
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
                        arr.push(item.Id)
                    }
                } )
                data.Data.SaclAuditTypeFilter = arr
                populateEditor( data )
            }
            else {
                notifyError( "There is a problem retrieving information for secure object " + name )
            }
        } )
        .fail( function ( jqXHR, textStatus, errorThrown ) {
            let msg = decipherJqXhrError( jqXHR, textStatus )
            notifyError( "There is a problem retrieving information for secure object " + name + "<br/>" + msg )
        } )

}

function resetEditor( showEditor ) {
    soVM.editor.reset( showEditor )
    clearEditorErrors()
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
    console.log(view)
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
                console.log( this.value() )
                options.model.set( "Right", 0 )
                
                var rightContainer = container.closest( 'tr.k-grid-edit-row' ).find( '[data-container-for=Right]' )
                
                createRightCheckBoxList( rightContainer, options.model )
                kendo.bind( rightContainer, options.model )
            }
        } )
    $( '<span class="k-invalid-msg" data-for="' + options.field + '"></span>' ).appendTo( container )

}

function createRightCheckBoxList( container, model ) {
    console.log(model)
    console.log( model.RightType)
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
        console.log( "checkbox clicked" )
        var cb = $(e.target)
        var bitFlag1 = parseInt( cb.val() )
        var isCompositeValue = !isPowerOfTwo( bitFlag1 )
        console.log( bitFlag1 )
        console.log( cb.prop( "checked" ) )
        if ( cb.prop( "checked" ) ) {
            if ( isCompositeValue ) {
                // loop thru all unchecked checkboxes and see if we need to check them
                container.find( "input:checkbox:not(:checked)" ).each( function ( index ) {
                    var bitFlag2 = parseInt( $( this ).val() )
                    console.log( bitFlag1 + " & " + bitFlag2 )
                    console.log( ( bitFlag1 & bitFlag2 ) == bitFlag2 )
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
                    console.log( bitFlag1 + " & " + bitFlag2 )
                    console.log( ( bitFlag1 & bitFlag2 ) == bitFlag1 )
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
        console.log( newRightVal )
        console.log(model.Right)
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
    console.log( "in validateRight" )
    console.log( input )
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
        console.log( input )
        console.log( data )
        for ( var i = 0; i < data.length; i++ ) {
            if ( data[i].UId != dataItem.UId && data[i].TrusteeUId == dataItem.TrusteeUId && data[i].RightType == input.val() ) {
                input.attr( "data-righttypevalidation-msg", "Group / Right Type combination<br/>must be unique" )
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
        dfd.resolve( true )
    }

    return dfd.promise()
}

