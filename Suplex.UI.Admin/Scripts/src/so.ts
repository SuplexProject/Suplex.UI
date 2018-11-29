import * as ID from "./ids";
import debounce from "lodash-es/debounce";
import {
    getActionUrl,
    decipherJqXhrError,
    showYesNoCancelDialog,
    showYesNoDialog,
    showProgress,
    hideProgress,
    notifyError,
    notifySuccess,
    isPowerOfTwo,
    dataSourceError,
    DialogResponse,
    AjaxResponse,
    AjaxResponseStatus,
} from "./utils";
import { spGrdDataSource } from "./sp"

let $soView = $( ID.SO_VIEW );
let $soTl = $( ID.SO_TREELIST );
let $soSpltr = $( ID.SO_SPLITTER );

let $soEditor = $( ID.SO_EDITOR );
let $soEditorError = $( ID.SO_EDITOR_ERROR );
let $soGrdDacl = $( ID.SO_GRD_DACL );
let $soGrdSacl = $( ID.SO_GRD_SACL );

let $soTb: JQuery = null;
let k$soTb: kendo.ui.ToolBar = null;
let validator: kendo.ui.Validator = null;

let k$soTl: kendo.ui.TreeList = null;
let k$soGrdDacl: kendo.ui.Grid = null;
let k$soGrdSacl: kendo.ui.Grid = null;
let k$soSpltr: kendo.ui.Splitter = null;

let $soCtxMnu: JQuery = null;
let k$soCtxMnu: kendo.ui.ContextMenu = null;

let $soDdlAuditFilter = $( ID.SO_DROPDOWNLIST_AUDIT_FILTER );
let $soPopAuditFilterContainer = $( ID.SO_POPUP_AUDIT_FILTER_CONTAINER );
let $soPopAuditFilter = $( ID.SO_POPUP_AUDIT_FILTER );
let k$soPopAuditFilter: kendo.ui.Popup = null

let auditTypes: string[] = [];
let rightTypes: string[] = [];
let rights = {};
let secureObjectDefaults = {};

let dacl: Array<any> = [];
let sacl: Array<any> = [];

let daclLocalId: number;
let saclLocalId: number;

//let dfdSecureObjectDefaults = $
//    .get(getActionUrl("GetSecureObjectDefaults", "Admin"))
//    .done(function(data) {
//        // let arr = [];
//        secureObjectDefaults = data;
//        (soVM as any).editor.set("secureObjectDefaults", secureObjectDefaults);
//    })
//    .fail(function(jqXHR, textStatus, errorThrown) {
//        let msg = decipherJqXhrError(jqXHR, textStatus);
//        notifyError(`There is a problem getting information from the server.<br/>${msg}`);
//    });

//let dfdAuditTypes = $
//    .get(getActionUrl("GetAuditTypes", "Admin"))
//    .done(function(data) {
//        auditTypes = data;
//        (soVM as any).editor.set("auditTypes", auditTypes);
//    })
//    .fail(function(jqXHR, textStatus, errorThrown) {
//        let msg = decipherJqXhrError(jqXHR, textStatus);
//        notifyError(`There is a problem getting information from the server.<br/>${msg}`);
//    });
//let dfdRights = $
//    .get(getActionUrl("GetRights", "Admin"))
//    .done(function(data) {
//        rightTypes = [];
//        rights = {};
//        $.each(data, function(index, item) {
//            rights[item.RightType] = rights[item.RightType] || [];
//            rights[item.RightType].push(item);
//            if (rightTypes.indexOf(item.RightType) < 0) {
//                rightTypes.push(item.RightType);
//            }
//        });
//    })
//    .fail(function(jqXHR, textStatus, errorThrown) {
//        let msg = decipherJqXhrError(jqXHR, textStatus);
//        notifyError(`There is a problem getting information from the server.<br/>${msg}`);
//    });

// block UI to ensure data is available before user starts to use
//showProgress();
//$.when(dfdAuditTypes, dfdRights, dfdSecureObjectDefaults).always(hideProgress);

export function soGetInitialData() {
    let dfd = $.Deferred();

    let dfdSecureObjectDefaults = $
        .get( getActionUrl( "GetSecureObjectDefaults", "Admin" ) )
        .done( function ( data ) {
            // let arr = [];
            secureObjectDefaults = data;
            ( soVM as any ).editor.set( "secureObjectDefaults", secureObjectDefaults );
        } )
        .fail( function ( jqXHR, textStatus, errorThrown ) {
            let msg = decipherJqXhrError( jqXHR, textStatus );
            notifyError( `There is a problem getting information from the server.<br/>${msg}` );
        } );
    let dfdAuditTypes = $
        .get( getActionUrl( "GetAuditTypes", "Admin" ) )
        .done( function ( data ) {
            auditTypes = data;
            ( soVM as any ).editor.set( "auditTypes", auditTypes );
        } )
        .fail( function ( jqXHR, textStatus, errorThrown ) {
            let msg = decipherJqXhrError( jqXHR, textStatus );
            notifyError( `There is a problem getting information from the server.<br/>${msg}` );
        } );
    let dfdRights = $
        .get( getActionUrl( "GetRights", "Admin" ) )
        .done( function ( data ) {
            rightTypes = [];
            rights = {};
            $.each( data, function ( index, item ) {
                rights[item.RightType] = rights[item.RightType] || [];
                rights[item.RightType].push( item );
                if ( rightTypes.indexOf( item.RightType ) < 0 ) {
                    rightTypes.push( item.RightType );
                }
            } );
        } )
        .fail( function ( jqXHR, textStatus, errorThrown ) {
            let msg = decipherJqXhrError( jqXHR, textStatus );
            notifyError( `There is a problem getting information from the server.<br/>${msg}` );
        } );

    $.when( dfdAuditTypes, dfdRights, dfdSecureObjectDefaults ).always( () => { dfd.resolve(); } );

    return dfd.promise();
}

export let soTrusteesDataSource = new kendo.data.DataSource( {
    data: [],
    schema: {
        model: {
            id: "UId",
            fields: {
                UId: { type: "string" },
                Name: { type: "string" }
            }
        }
    },
    sort: { field: "Name", dir: "asc" }
} );

let soDaclDataSource = new kendo.data.DataSource( {
    //data: [],
    transport: {
        read: function ( options ) {
            options.success( dacl );
            //$.each( _kDsDacl.data(), function ( idx, record ) {
            //    if ( !record.hasOwnProperty( "LocalUId" ) || !record["LocalUId"] ) { // not present or null
            //        record["LocalUId"] = record["uid"];
            //    }
            //} );
        },
        create: function ( options ) {
            options.data.LocalId = ++daclLocalId;
            dacl.push( options.data );
            options.success( options.data );
        },
        update: function ( options ) {
            for ( let i = 0; i < dacl.length; i++ ) {
                if ( dacl[i].LocalId == options.data.LocalId ) {
                    dacl[i] = options.data;
                }
            }
            options.success( options.data );
            console.log( "update ds" );
        },
        destroy: function ( options ) {
            for ( let i = 0; i < dacl.length; i++ ) {
                if ( dacl[i].LocalId == options.data.LocalId ) {
                    dacl.splice( i, 1 );
                    break;
                }
            }
            options.success( options.data );
        }
    },
    schema: {
        model: {
            id: "LocalId", //"UId", // this is a MUST in order for CRUD to work in Grid
            fields: {
                LocalId: { editable: false },
                UId: { editable: false, nullable: true },
                TrusteeUId: {
                    type: "string",
                    validation: {
                        //required: true,
                        trusteevalidation: validateTrustee  // avoid setting the required attribute so the external validator will not validate this field
                    },
                },
                RightType: {
                    type: "string",
                    validation: {
                        //required: true,
                        righttypevalidation: validateRightType,
                    },
                },
                Right: {
                    defaultValue: [],
                    validation: {
                        //required: true,
                        rightvalidation: validateRight,
                    },
                },
                Allowed: {
                    type: "boolean",
                    defaultValue: function () {
                        return secureObjectDefaults["DaclAllowed"] || false;
                    },
                },
                Inheritable: {
                    type: "boolean",
                    defaultValue: function () {
                        return secureObjectDefaults["DaclInheritable"] || false;
                    },
                },
            },
        },
    },
} );

let soSaclDataSource = new kendo.data.DataSource( {
    //data: [],
    transport: {
        read: function ( options ) {
            options.success( sacl );
        },
        create: function ( options ) {
            options.data.LocalId = ++saclLocalId;
            sacl.push( options.data );
            options.success( options.data );
        },
        update: function ( options ) {
            for ( let i = 0; i < sacl.length; i++ ) {
                if ( sacl[i].LocalId == options.data.LocalId ) {
                    sacl[i] = options.data;
                }
            }
            options.success( options.data );
        },
        destroy: function ( options ) {
            for ( let i = 0; i < sacl.length; i++ ) {
                if ( sacl[i].LocalId == options.data.LocalId ) {
                    sacl.splice( i, 1 );
                    break;
                }
            }
            options.success( options.data );
        }
    },
    schema: {
        model: {
            id: "LocalId", // "UId", // this is a MUST in order for CRUD to work in Grid
            fields: {
                LocalId: { editable: false },
                UId: { editable: false, nullable: true },
                TrusteeUId: {
                    type: "string",
                    validation: {
                        //required: true,
                        trusteevalidation: validateTrustee
                    },
                },
                RightType: {
                    type: "string",
                    validation: {
                        //required: true,
                        righttypevalidation: validateRightType,
                    },
                },
                Right: {
                    defaultValue: [],
                    validation: {
                        required: true,
                        rightvalidation: validateRight,
                    },
                },
                Allowed: {
                    type: "boolean",
                    defaultValue: function () {
                        return secureObjectDefaults["SaclAllowed"] || false;
                    },
                },
                Denied: {
                    type: "boolean",
                    defaultValue: function () {
                        return secureObjectDefaults["SaclDenied"] || false;
                    },
                },
                Inheritable: {
                    type: "boolean",
                    defaultValue: function () {
                        return secureObjectDefaults["SaclInheritable"] || false;
                    },
                },
            },
        },
    },

} );

let soEditorModel = kendo.data.Model.define( {
    id: "UId",
    fields: {
        UId: { editable: false, nullable: true },
        UniqueName: {
            type: "string",
            validation: { required: true },
        },
        ParentUId: { type: "string" },
        IsEnabled: {
            type: "boolean",
            defaultValue: function () {
                return typeof secureObjectDefaults["IsEnabled"] === "boolean" ? secureObjectDefaults["IsEnabled"] : false;
            },
        },
        DaclAllowInherit: {
            type: "boolean",
            defaultValue: function () {
                return typeof secureObjectDefaults["DaclAllowInherit"] === "boolean" ? secureObjectDefaults["DaclAllowInherit"] : false;
            },
        },
        SaclAllowInherit: {
            type: "boolean",
            defaultValue: function () {
                return typeof secureObjectDefaults["SaclAllowInherit"] === "boolean" ? secureObjectDefaults["SaclAllowInherit"] : false;
            },
        },
        SaclAuditTypeFilter: {
            defaultValue: function () {
                return secureObjectDefaults["SaclAuditTypeFilterArray"] || [];
            },
        },
        Dacl: {},
        Sacl: {},
    },
} );

// properties required at the point of binding the view to the ViewModel must be a concrete value
// if the property value depends on external factors and may not be available at the time of binding,
// set it to a default value first.this will allow the binding to be successful
let soVM = kendo.observable( {
    visible: false,
    selectedUId: null,
    editor: {
        // fields here are used by the editor
        visible: false,
        hasChanges: false,
        hasError: false,
        model: new soEditorModel(), // matches the model from the server
        auditTypes: [], // one time set by ajax call. use to display the audit type filter checkboxes
        reset: function ( showEditor?: boolean ) {
            if ( showEditor == undefined ) {
                showEditor = false;
            }
            if ( showEditor != this.get( "visible" ) ) {
                this.set( "visible", showEditor );
                if ( showEditor )
                    k$soSpltr.resize( true );     // somehow hidden elements don't automatically resize. this command forces it
            }
            // this.set( "visible", false )
            this.set( "hasChanges", false );
            this.set( "hasError", false );
            this.set( "model", new soEditorModel() );
        },
        raiseChange: function () {
            // event handler for UI elements bound to the model. fired when there are changes to the element
            let that = this;
            that.editor.set( "hasChanges", true );
        },
        kDsDacl: soDaclDataSource, // required so we display dacl item count on the editor
        kDsSacl: soSaclDataSource, // required so we display sacl item count on the editor
        daclItemCount: function () {
            return this.get( "kDsDacl" ) ? this.get( "kDsDacl" ).total() : 0;
        },
        saclItemCount: function () {
            return this.get( "kDsSacl" ) ? this.get( "kDsSacl" ).total() : 0;
        },
        //securityInheritanceState: function() {  
        //    // returns default if default setting, else modified
        //    if (
        //        this.model.get("DaclAllowInherit") == secureObjectDefaults["DaclAllowInherit"] &&
        //        this.model.get("SaclAllowInherit") == secureObjectDefaults["SaclAllowInherit"] &&
        //        this.saclAuditTypeFilterIsDefault()
        //    )
        //        return "Default";
        //    else return "Modified";
        //},
        saclAuditTypeFilterState: function () {
            return ( this.saclAuditTypeFilterIsDefault() == true ? "Default" : "Modified" );
        },
        saclAuditTypeFilterIsDefault: function () {
            return (
                this.model.get( "SaclAuditTypeFilter" ).reduce( function ( result: any, itemVal: any ) {
                    return result | itemVal;
                }, 0 ) == secureObjectDefaults["SaclAuditTypeFilter"]
            );
        },
        setSaclAuditTypeFilterToDefault: function () {
            let that = this;
            that.editor.model.set( "SaclAuditTypeFilter", secureObjectDefaults["SaclAuditTypeFilterArray"] );
            that.editor.set( "hasChanges", true );
        },

    },
    secureObjectSelected: function () {
        return this.get( "selectedUId" ) != null;
    },
    reset: function () {
        // this.set( "visible", false )  // visibility determined by main.js
        this.set( "selectedUId", null );
        this.editor.reset();
    },
} );

// view model
function setVMEditorHasChangesFlag( trueorfalse: boolean ) {
    if ( ( soVM as any ).editor.get( "hasChanges" ) == trueorfalse ) return;
    ( soVM as any ).editor.set( "hasChanges", trueorfalse );
}
function setVMEditorHasErrorFlag( trueorfalse: boolean ) {
    if ( ( soVM as any ).editor.get( "hasError" ) == trueorfalse ) return;
    ( soVM as any ).editor.set( "hasError", trueorfalse );
}
function setVMSelectedUId( uId: string ) {
    if ( soVM.get( "selectedUId" ) != uId ) {
        soVM.set( "selectedUId", uId );
    }
}

export function soSetup() {

    setupWidgets();

    kendo.bind( $soView, soVM );

    setupVariables();

    setupEventHandlers();


    enableDisableToolBarButtons( false );   // disable the buttons initially as nothing was selected

    // resetSecureObjects(); // without this data wont show up on the treeview when adding item to the datasouce right after launch

}

function setupWidgets() {
    //https://demos.telerik.com/kendo-ui/grid/editing-custom
    //https://docs.telerik.com/kendo-ui/controls/data-management/grid/how-to/Templates/grid-with-checkbox-column
    //https://community.progress.com/community_groups/openedge_kendo_ui_builder/w/openedgekendouibuilder/2923.how-to-add-a-combo-box-or-a-dropdownlist-to-a-grid-in-a-custom-view
    $soGrdDacl.kendoGrid( {
        dataSource: soDaclDataSource,
        filterable: true,
        resizable: true,
        columns: [
            {
                field: "TrusteeUId",
                title: "Group",
                width: "200px",
                editor: trusteeDropDownEditor,
                template: getTrusteeName,
            },
            {
                field: "RightType",
                title: "Right Type",
                width: "120px",
                editor: rightTypeDropDownListEditor,
            },
            {
                field: "Right",
                title: "Right",
                width: "120px",
                template: getRightAsString,
            }, // editor is created in the grid edit event. We will bind the value manually
            {
                field: "Allowed",
                title: "Allowed",
                width: "75px",
                template: "<input id='1#=UId#' type='checkbox' class='k-checkbox' #: Allowed ? 'checked=\"checked\"' : '' # disabled='disabled' /><label class='k-checkbox-label' for='1#=UId#' />",
                editor: boolEditor
            },
            {
                field: "Inheritable",
                title: "Inheritable",
                width: "85px",
                template: "<input id='2#=UId#' type='checkbox' class='k-checkbox' #: Inheritable ? 'checked =\"checked\"' : '' # disabled='disabled' /><label class='k-checkbox-label' for='2#=UId#' />",
                editor: boolEditor
            },
            {
                command: [
                    { name: "edit", text: { edit: "", update: "", cancel: "" } },
                    {
                        name: "customdelete",
                        text: "",
                        iconClass: "k-icon k-i-close",
                        click: function ( e: any ) {
                            e.preventDefault();
                            let tr = $( e.target ).closest( "tr" );
                            let data = this.dataItem( tr );
                            $.when( showYesNoDialog( "Confirm Delete", "Are you sure you want to delete this permission record?" ) )
                                .then( ( response: DialogResponse ) => {
                                    if ( response == DialogResponse.Yes ) {
                                        // ok
                                        k$soGrdDacl.dataSource.remove( data );
                                        k$soGrdDacl.dataSource.sync()
                                        setVMEditorHasChangesFlag( true );
                                    }
                                } );
                        },
                    },
                ],
            },
        ],
        //toolbar: [ { name: "create", text: "New Permission" } ],
        editable: "inline",
        edit: function ( e: kendo.ui.GridEditEvent ) {
            // edit event is triggered before the editor form is shown. By this time the editor UI elements are already bound to the model.
            let model = e.model;
            let container = e.container;
            let rightContainer = container.find( "[data-container-for=Right]" );
            createRightCheckBoxList( rightContainer, model );
            // disable validateOnBlur. Validate only when the update button is checked. This is so that the error will not stop the right checkboxes
            // from being displayed when there is a change in the right
            // https://docs.telerik.com/kendo-ui/knowledge-base/grid-disable-validation-on-blur
            delete ( e.model as any )._events.set;
        },
        save: function ( e: kendo.ui.GridSaveEvent ) {
            // can also do validation here
            // and use e.preventDefault() to stop the save
            if ( this.dataSource.hasChanges() ) {
                // dataSource.hasChanges() is true when
                // 1. data item dirty is true( so if you clicked edit and save without doing anything, dirty will be false) or
                // 2. new item added
                // item delete has no effect on this flag
                setVMEditorHasChangesFlag( true );
                console.log( "save clicked" );
                console.log( e )
            }
        },
        remove: function ( e: kendo.ui.GridRemoveEvent ) {
            // not triggered when we use custom command
            setVMEditorHasChangesFlag( true );
        },
    } );

    $soGrdSacl.kendoGrid( {
        dataSource: soSaclDataSource,
        filterable: true,
        resizable: true,
        columns: [
            {
                field: "TrusteeUId",
                title: "Group",
                width: "200px",
                editor: trusteeDropDownEditor,
                template: getTrusteeName,
            },
            {
                field: "RightType",
                title: "Right Type",
                width: "120px",
                editor: rightTypeDropDownListEditor,
            },
            {
                field: "Right",
                title: "Right",
                width: "120px",
                template: getRightAsString,
            }, // editor is created in the grid edit event. We will bind the value manually
            {
                field: "Allowed",
                title: "Allowed",
                template: "<input id='1#=UId#' type='checkbox' class='k-checkbox' #: Allowed ? 'checked=\"checked\"' : '' # disabled='disabled' /><label class='k-checkbox-label' for='1#=UId#' />",
                editor: boolEditor
            },
            {
                field: "Denied",
                title: "Denied",
                template: "<input id='2#=UId#' type='checkbox' class='k-checkbox' #: Denied ? 'checked=\"checked\"' : '' # disabled='disabled' /><label class='k-checkbox-label' for='2#=UId#' />",
                editor: boolEditor
            },
            {
                field: "Inheritable",
                title: "Inheritable",
                template: "<input id='3#=UId#' type='checkbox' class='k-checkbox' #: Inheritable ? 'checked =\"checked\"' : '' # disabled='disabled' /><label class='k-checkbox-label' for='3#=UId#' />",
                editor: boolEditor,
            },
            {
                command: [
                    { name: "edit", text: { edit: "", update: "", cancel: "" } },
                    {
                        name: "customdelete",
                        text: "",
                        iconClass: "k-icon k-i-close",
                        click: function ( e: any ) {
                            e.preventDefault();
                            let tr = $( e.target ).closest( "tr" );
                            let data = this.dataItem( tr );
                            $.when( showYesNoDialog( "Confirm Delete", "Are you sure you want to delete this audit record?" ) )
                                .then( ( response: DialogResponse ) => {
                                    if ( response == DialogResponse.Yes ) {
                                        // ok
                                        k$soGrdSacl.dataSource.remove( data );
                                        k$soGrdSacl.dataSource.sync();
                                        setVMEditorHasChangesFlag( true );
                                    }
                                } );
                        },
                    },
                ],
            },
        ],
        //toolbar: [{ name: "create", text: "New Audit" }],
        //toolbar: [
        //    { template: kendo.template( $( "#soGrdSaclToolBarTemplate" ).html() ) } 
        //    ],        
        editable: "inline",
        edit: function ( e: kendo.ui.GridEditEvent ) {
            // edit event is triggered before the editor form is shown. By this time the editor UI elements are already bound to the model.
            let model = e.model;
            let container = e.container;
            let rightContainer = container.find( "[data-container-for=Right]" );
            createRightCheckBoxList( rightContainer, model );
            // disable validateOnBlur. Validate only when the update button is checked. This is so that the error will not stop the right checkboxes
            // from being displayed when there is a change in the right
            // https://docs.telerik.com/kendo-ui/knowledge-base/grid-disable-validation-on-blur
            delete ( e.model as any )._events.set;
        },
        save: function ( e: kendo.ui.GridSaveEvent ) {
            // can also do validation here
            // and use e.preventDefault() to stop the save
            if ( this.dataSource.hasChanges() ) {
                // dataSource.hasChanges() is true when
                // 1. data item dirty is true( so if you clicked edit and save without doing anything, dirty will be false) or
                // 2. new item added
                // item delete has no effect on this flag
                setVMEditorHasChangesFlag( true );
            }
        },
        remove: function ( e: kendo.ui.GridRemoveEvent ) {
            // won't work if we use custom command
            setVMEditorHasChangesFlag( true );
        },
    } );

    // there is a bug in the asp.net core wrapper (where the parentId is not serialized so we are using the client to instantiate the widget
    // https://github.com/telerik/kendo-ui-core/issues/4588) 
    const uniqueNameTemplate = "<span class='#: IsEnabled ? \"\" : \"k-state-disabled\" #'><span class='k-sprite #: IsSecure ? \"icon-secure\" : \"icon-non-secure\" #'></span><span>#: UniqueName #</span></span>";
    const isEnabledTemplate = "<input id='1#=UniqueName#' type='checkbox' class='k-checkbox' #: IsEnabled ? 'checked=\"checked\"' : '' # disabled='disabled' /><label class='k-checkbox-label' for='1#=UniqueName#' />";
    const daclAllowInheritTemplate = "<input id='2#=UniqueName#' type='checkbox' class='k-checkbox' #: DaclAllowInherit ? 'checked=\"checked\"' : '' # disabled='disabled' /><label class='k-checkbox-label' for='2#=UniqueName#' />";
    const saclAllowInheritTemplate = "<input id='3#=UniqueName#' type='checkbox' class='k-checkbox' #: SaclAllowInherit ? 'checked=\"checked\"' : '' # disabled='disabled' /><label class='k-checkbox-label' for=3#=UniqueName#' />";
    $soTl.kendoTreeList( {
        autoBind: false,
        editable: { move: true },
        filterable: true,
        selectable: true,
        resizable: true,
        scrollable: true,
        columns: [
            { field: "UniqueName", width: 200, template: uniqueNameTemplate },
            { field: "IsEnabled", title: "Enabled", template: isEnabledTemplate },
            { field: "DaclAllowInherit", title: "Inherit Permissions", template: daclAllowInheritTemplate },
            { field: "SaclAllowInherit", title: "Inherit Audit", template: saclAllowInheritTemplate }
        ],
        dataSource: {
            type: "aspnetmvc-ajax",
            transport: {
                read: {
                    url: getActionUrl( "GetSecureObjectTree", "Admin" )
                }
            },
            schema: {
                data: "Data",
                total: "Total",
                errors: "Errors",
                model: {
                    id: "UId",
                    parentId: "ParentUId",
                    expanded: true,
                    fields: {
                        UId: { type: "string", nullable: false },
                        ParentUId: { type: "string", nullable: true },
                        UniqueName: { type: "string" },
                        IsEnabled: { type: "boolean" },
                        IsSecure: { type: "boolean" },
                        DaclAllowInherit: { type: "boolean" },
                        SaclAllowInherit: { type: "boolean" },
                    }
                }
            },
            sort: { field: "UniqueName", dir: "asc" },
            error: dataSourceError
        },
        drop: soTlDrop,
        messages: {
            noRows: ""
        }
    } )

    $( ID.SO_TREELIST_CTX_MENU ).kendoContextMenu( {
        target: "#soTl", //$(ID.SO_SPLITTER).find(".k-pane:first"),
        filter: "tbody > tr, thead > tr", //, .wrapper",
        open: function ( e: kendo.ui.ContextMenuOpenEvent ) {
            let ele = $( e.target );
            let ctxMnuEle = $( e.item );
            let headerSelected = ( ele.closest( 'thead' ).length > 0 );
            ctxMnuEle.find( ".tree-node-selected" ).each( ( idx, ele ) => {
                //$( ele ).prop( "disabled", headerSelected );

                k$soCtxMnu.enable( ele, !headerSelected );
            } );
            $( "body" ).addClass( "no-scroll" );    // prevent scrollbar from appearing unnecessarily in the <body> 
        },
        close: function ( e: kendo.ui.ContextMenuCloseEvent ) {
            $( "body" ).removeClass( "no-scroll" );
        },
        select: function ( e: kendo.ui.ContextMenuSelectEvent ) {
            let target = $( e.target );
            switch ( "#" + e.item.id ) {
                case ID.SO_TREELIST_CTX_MENU_NEW_ROOT:
                case ID.SO_TREELIST_CTX_MENU_NEW_CHILD:
                    soVerifySaveChanges()
                        .then( ( proceed ) => {
                            if ( proceed ) {
                                resetEditor( true );
                                if ( ( "#" + e.item.id ) == ID.SO_TREELIST_CTX_MENU_NEW_ROOT ) {
                                    ( soVM as any ).editor.model.set( "UniqueName", "New Root" );
                                    clearTreeSelection();
                                } else {
                                    let dataItem = k$soTl.dataItem( target as JQuery ); // TODO: Check if the type is correct
                                    selectTreeItem( ( dataItem as any ).UId ); // select the node pointed by the context menu
                                    ( soVM as any ).editor.model.set( "UniqueName", "New Child" );
                                    ( soVM as any ).editor.model.set( "ParentUId", ( dataItem as any ).UId );
                                }
                            }
                        } );
                    break;

                case ID.SO_TREELIST_CTX_MENU_COPY_AS_ROOT:
                case ID.SO_TREELIST_CTX_MENU_COPY_AS_CHILD:
                    soVerifySaveChanges()
                        .then( () => {
                            let dataItem = k$soTl.dataItem( target as JQuery );
                            selectTreeItem( ( dataItem as any ).UId ); // select the node pointed by the context menu
                            if ( ( "#" + e.item.id ) == ID.SO_TREELIST_CTX_MENU_COPY_AS_ROOT ) {
                                $( ID.SO_TBB_COPY_AS_ROOT ).click();
                            }
                            else {
                                $( ID.SO_TBB_COPY_AS_CHILD ).click();
                            }

                        } )
                    break;

                case ID.SO_TREELIST_CTX_MENU_DELETE:
                    let itemToDelete: any = k$soTl.dataItem( target as JQuery );
                    if ( itemToDelete ) {
                        // get confirmation to proceed
                        showYesNoDialog( "Confirm Delete", `Are you sure you want to delete Secure Object <b>${itemToDelete.UniqueName}</b> and all its child items?` )
                            .then( ( response: DialogResponse ) => {
                                if ( response == DialogResponse.Yes ) {
                                    showProgress();
                                    deleteSecureObject( itemToDelete )
                                        .then( ( data: AjaxResponse ) => {
                                            return processDeleteActionResponse( data, itemToDelete );
                                        } )
                                        .always( hideProgress );
                                }
                            } )
                    }

                    break;

                case ID.SO_TREELIST_CTX_MENU_EXPAND_TREE:
                    expandCollapse( true );
                    break;

                case ID.SO_TREELIST_CTX_MENU_EXPAND_NODE:
                    let item1: JQuery<HTMLElement> = target.closest( "tr" ) as JQuery<HTMLElement>;
                    expandCollapse( true, item1 );
                    break;

                case ID.SO_TREELIST_CTX_MENU_COLLAPSE_TREE:
                    expandCollapse( false );
                    break;

                case ID.SO_TREELIST_CTX_MENU_COLLAPSE_NODE:
                    let item2: JQuery<HTMLElement> = target.closest( "tr" ) as JQuery<HTMLElement>;
                    expandCollapse( false, item2 );
                    break;

                default:
                    break;
            }
            // remove focus from node
            setTimeout( function () {
                target.removeClass( "k-state-focused" );
            } );
        },
    } );

    validator = $soEditor
        .kendoValidator( {
            validateOnBlur: false,
            validate: function ( e: kendo.ui.ValidatorValidateEvent ) {
                $( "span.k-invalid-msg" ).hide();
            },
        } )
        .data( "kendoValidator" );

    $soPopAuditFilter.kendoPopup( {
        anchor: $soDdlAuditFilter,
        appendTo: $soPopAuditFilterContainer,
        open: function ( e ) {
            $( "body" ).addClass( "no-scroll" );    // prevent scrollbar from appearing unnecessarily in the <body> 
        },
        close: function ( e ) {
            $( "body" ).removeClass( "no-scroll" );
        }
    } );
    $soDdlAuditFilter
        .click( function () {
            ( k$soPopAuditFilter as any ).toggle();
            //( $( "#soPopAuditFilter" ).data( "kendoPopup" ) as any ).toggle();
        } );

    //$( "#soDdlAuditFilter .k-dropdown-wrap" ).hover( function () {
    $( ID.SO_DROPDOWNLIST_AUDIT_FILTER + " .k-dropdown-wrap" ).hover( function () {
        $( this ).toggleClass( "k-state-hover" );
    } );

}
function setupVariables() {
    $soTb = $( ID.SO_TB );
    k$soTb = $soTb.data( 'kendoToolBar' );
    k$soTl = $soTl.data( "kendoTreeList" );
    k$soGrdDacl = $soGrdDacl.data( "kendoGrid" );
    k$soGrdSacl = $soGrdSacl.data( "kendoGrid" );
    $soCtxMnu = $( ID.SO_TREELIST_CTX_MENU );
    k$soCtxMnu = $soCtxMnu.data( "kendoContextMenu" );
    k$soSpltr = $soSpltr.data( "kendoSplitter" );
    k$soPopAuditFilter = $soPopAuditFilter.data( "kendoPopup" );
}
function setupEventHandlers() {
    $( window )
        .resize( debounce( resizeSplitter, 500 ) )
        .trigger( "resize" );

    $( ID.SO_TREELIST ).on( "click", "tbody tr", soTlClick );

    soVM.bind( 'change', function ( e: any ) {
        if ( e.field == "selectedUId" ) {
            enableDisableToolBarButtons( this.secureObjectSelected() );
        };
    } )

    $( "#soBtnDaclAdd" ).on( 'click', function ( e ) {
        k$soGrdDacl.addRow();
    } )
    $( "#soBtnSaclAdd" ).on( 'click', function ( e ) {
        k$soGrdSacl.addRow();
    } )

    // binding to cancel event doesn't work - at that point, the edit and delete buttons are not present yet
    //$( ID.SO_GRD_DACL ).data( 'kendoGrid' ).bind( "dataBound", setEditDeleteCommandButtonToolTip );
    //$( ID.SO_GRD_DACL ).data( 'kendoGrid' ).bind( "cancel", setEditDeleteCommandButtonToolTip );
    //$( ID.SO_GRD_DACL ).data( 'kendoGrid' ).bind( "edit", setUpdateCancelCommandButtonToolTip );
    //$( ID.SO_GRD_SACL ).data( 'kendoGrid' ).bind( "dataBound", setEditDeleteCommandButtonToolTip );
    //$( ID.SO_GRD_SACL ).data( 'kendoGrid' ).bind( "cancel", setEditDeleteCommandButtonToolTip );
    //$( ID.SO_GRD_SACL ).data( 'kendoGrid' ).bind( "edit", setUpdateCancelCommandButtonToolTip );

    $( ID.SO_GRD_DACL + "," + ID.SO_GRD_SACL ).on( 'mouseenter', '.k-grid-edit', { title: "Edit" }, setCommandButtonTitle );
    $( ID.SO_GRD_DACL + "," + ID.SO_GRD_SACL ).on( 'mouseenter', '.k-grid-customdelete', { title: "Delete" }, setCommandButtonTitle );
    $( ID.SO_GRD_DACL + "," + ID.SO_GRD_SACL ).on( 'mouseenter', '.k-grid-cancel', { title: "Cancel" }, setCommandButtonTitle );
    $( ID.SO_GRD_DACL + "," + ID.SO_GRD_SACL ).on( 'mouseenter', '.k-grid-update', { title: "Update" }, setCommandButtonTitle );

    spGrdDataSource.bind( 'change', function ( e: kendo.data.DataSourceChangeEvent ) {
        //console.log( e.action, e.items );
        let proceed = false;
        let impactedGroups: any[] = [];
        // see if we need to do anything
        if ( typeof e.action == 'undefined' ) {
            proceed = true;
        } else if ( e.action == 'add' || e.action == 'remove' ) {
            // see if impacted items are group. we are only interested in groups
            impactedGroups = e.items.filter( ( item: any ) => { return !item.IsUser } )
            if ( impactedGroups.length > 0 ) {
                proceed = true;
            }
        }
        if ( proceed ) {
            //console.log("refreshing trustees")
            var data = this.data().toJSON();
            // take only groups and only UId and Name
            var trustees = data.filter( ( item: any ) => { return !item.IsUser } )
                .map( ( item: any ) => { return { "UId": item.UId, "Name": item.Name } } )
            soTrusteesDataSource.data( trustees );

            // if action is delete, check if dacl sacl has a reference to the deleted trustees
            // what happens if dacl/sacl is in edit mode?
            if ( e.action == "remove" ) {

                if ( dacl.length > 0 || sacl.length > 0 ) {
                    for ( var i = 0, len = impactedGroups.length; i < len; i++ ) {
                        // if trustee is referenced in dacl / sacl, delete them
                        dacl = dacl.filter( ( item: any ) => { return ( item.TrusteeUId != impactedGroups[i].UId ) } );
                        sacl = dacl.filter( ( item: any ) => { return ( item.TrusteeUId != impactedGroups[i].UId ) } );
                    }
                    soDaclDataSource.read();
                    soSaclDataSource.read();
                    // doesn't look like we need to refresh grid

                }
            }

        }
    } )
}

function setCommandButtonTitle( e: JQueryMouseEventObject ) {
    let btn = <HTMLElement> e.target;
    if ( btn.title != e.data.title )
        btn.title = e.data.title;
}
// kendo.ui.GridCancelEvent definition is wrong!
//function setEditDeleteCommandButtonToolTip( e: kendo.ui.GridDataBoundEvent | kendo.ui.GridCancelEvent ) {
//function setEditDeleteCommandButtonToolTip( e: any ) {
//    if ( typeof e.container == 'undefined' ) {
//        e.sender.element.find( ".k-grid-edit" ).prop( "title", "Edit" );
//        e.sender.element.find( ".k-grid-customdelete" ).prop( "title", "Delete" );
//    }
//    else {
//        e.container.find( ".k-grid-edit" ).prop( "title", "Edit" );
//        e.container.find( ".k-grid-customdelete" ).prop( "title", "Delete" );
//    }
//}
//function setUpdateCancelCommandButtonToolTip( e: kendo.ui.GridEditEvent ) {
//    e.container.find( ".k-grid-update" ).prop( "title", "Update" );
//    e.container.find( ".k-grid-cancel" ).prop( "title", "Cancel" );
//}
function enableDisableToolBarButtons( enable: boolean ) {
    k$soTb.enable( $( ID.SO_TBB_COPY ), enable );
    k$soTb.enable( $( ID.SO_TBB_NEW_CHILD ), enable );
    k$soTb.enable( $( ID.SO_TBB_EXPAND_NODE ), enable );
    k$soTb.enable( $( ID.SO_TBB_COLLAPSE_NODE ), enable );
}

export function soShow() {
    if ( !soVM.get( "visible" ) ) {
        soVM.set( "visible", true );
        k$soSpltr.resize( true );
    }
}
export function soHide() {
    if ( soVM.get( "visible" ) ) soVM.set( "visible", false );
}
export function soReset() {
    ( soVM as any ).reset();
    resetEditor( false )
    k$soTl.dataSource.data( [] );
}
export function soLoad() {
    k$soTl.dataSource.read();
}
function resizeSplitter() {
    //console.log( "In resizeSplitter..." );
    let top = 85; //125; // height occupied above splitter
    let bottom = 25; // height occupied below splitter
    let height = $( window ).height() - ( top + bottom ) - 1; // to stop the body scrollbar from appearing
    height = height <= 0 ? 100 : height;
    k$soSpltr.wrapper.height( height );
    k$soSpltr.resize( true );
}
export function soTbbExpandClick( e: any ) {

    switch ( "#" + e.id ) {
        case ID.SO_TBB_EXPAND:
            console.log( "-- expand" );

            //https://www.telerik.com/forums/open-split-button-with-js
            let $btn = $( "#" + e.id ).closest( '.k-split-button' );
            let popup = $btn.data( "kendoPopup" );
            if ( popup ) {
                if ( popup.visible() ) {
                    $( "body" ).removeClass( "no-scroll" );
                    popup.close();
                }
                else {
                    $( "body" ).addClass( "no-scroll" );
                    popup.open();
                }
            }

            break;

        case ID.SO_TBB_EXPAND_NODE:
            let node = k$soTl.select();
            expandCollapse( true, node );
            break;

        case ID.SO_TBB_EXPAND_TREE:
            expandCollapse( true );
            break;

    }
}
export function soTbbCollapseClick( e: any ) {

    switch ( "#" + e.id ) {
        case ID.SO_TBB_COLLAPSE:
            console.log( "-- collapse" );

            //https://www.telerik.com/forums/open-split-button-with-js
            let $btn = $( "#" + e.id ).closest( '.k-split-button' );
            let popup = $btn.data( "kendoPopup" );
            if ( popup ) {
                if ( popup.visible() ) {
                    $( "body" ).removeClass( "no-scroll" );
                    popup.close();
                }
                else {
                    $( "body" ).addClass( "no-scroll" );
                    popup.open();
                }
            }

            break;
        case ID.SO_TBB_COLLAPSE_NODE:
            let node = k$soTl.select();
            expandCollapse( false, node );
            break;

        case ID.SO_TBB_COLLAPSE_TREE:
            expandCollapse( false );
            break;
    }

}
function expandCollapse( expand: boolean, node?: JQuery<HTMLElement> ) {

    if ( !node || node.length == 0 ) {
        //let rows = k$soTl.tbody.find( "tr.k-treelist-group" );
        if ( expand ) {
            k$soTl.tbody.find( ".k-i-expand" ).closest( "tr" ).map( ( idx: number, row: HTMLElement ) => {
                k$soTl.expand( row );
            } )
        }
        else {
            k$soTl.tbody.find( ".k-i-collapse" ).closest( "tr" ).map( ( idx: number, row: HTMLElement ) => {
                k$soTl.collapse( row );
            } )
        }
    }
    else {
        if ( expand ) {
            k$soTl.expand( node );
        }
        else {
            k$soTl.collapse( node );
        }
        let model: kendo.data.TreeListModel = k$soTl.dataItem( node );
        let ds = k$soTl.dataSource as kendo.data.TreeListDataSource;
        expandCollapseChildNodes( expand, ds, ds.childNodes( model ) );
    }
}
function expandCollapseChildNodes( expand: boolean, ds: kendo.data.TreeListDataSource, nodes: kendo.data.TreeListModel[] ) {
    for ( let i = 0; i < nodes.length; i++ ) {
        nodes[i].set( "expanded", expand );
        expandCollapseChildNodes( expand, ds, ds.childNodes( nodes[i] ) );
    }
}
export function soTbbNewClick( e: any ) {
    console.log( "In soTbbNewClick..." );

    switch ( "#" + e.id ) {
        case ID.SO_TBB_NEW:
            console.log( "-- new" );

            //https://www.telerik.com/forums/open-split-button-with-js
            let $btn = $( "#" + e.id ).closest( '.k-split-button' );
            let popup = $btn.data( "kendoPopup" );
            if ( popup ) {
                if ( popup.visible() ) {
                    $( "body" ).removeClass( "no-scroll" );
                    popup.close();
                }
                else {
                    $( "body" ).addClass( "no-scroll" );
                    popup.open();
                }
            }

            break;
        case ID.SO_TBB_NEW_ROOT:
        case ID.SO_TBB_NEW_CHILD:

            soVerifySaveChanges().then( function ( proceed ) {
                if ( proceed ) {
                    // go ahead and prepare the editor
                    resetEditor( true );
                    // if there is a selected node, set the parent of the model
                    // else assume new root
                    if ( "#" + e.id == ID.SO_TBB_NEW_CHILD && soVM.get( "selectedUId" ) != null ) {
                        ( soVM as any ).editor.model.set( "ParentUId", soVM.get( "selectedUId" ) );
                        ( soVM as any ).editor.model.set( "UniqueName", "New Child" );
                    }
                    else {
                        // clear node selection
                        clearTreeSelection();
                        ( soVM as any ).editor.model.set( "UniqueName", "New Root" );
                    }
                }
            } );
            break;

    }
}
export function soTbbCopyClick( e: any ): void {
    console.log( "In spTbbCopyClick..." );
    let asRoot: boolean = false;

    switch ( "#" + e.id ) {
        case ID.SO_TBB_COPY:
            //https://www.telerik.com/forums/open-split-button-with-js
            let $btn = $( "#" + e.id ).closest( '.k-split-button' );
            let popup = $btn.data( "kendoPopup" );
            if ( popup ) {
                if ( popup.visible() ) {
                    $( "body" ).removeClass( "no-scroll" );
                    popup.close();
                }
                else {
                    $( "body" ).addClass( "no-scroll" );
                    popup.open();
                }
            }

            break;

        case ID.SO_TBB_COPY_AS_ROOT:
            asRoot = true;
        case ID.SO_TBB_COPY_AS_CHILD:

            let selectedItem: any = k$soTl.dataItem( k$soTl.select() );
            if ( selectedItem ) {
                let parentUId: string = asRoot ? null : selectedItem.UId;
                // if editor has unsaved changes, prompt to save first
                // select destination node (if root, deselect all nodes)
                // reset editor, populate editor with source node, updte parentUId
                // set uniquename = source unique name( copy )
                // make sure has changes = false so they have to make a change in order to save
                soVerifySaveChanges().then( function ( proceed: boolean ) {
                    console.log( "-- " + proceed );
                    if ( proceed ) {
                        resetEditor( true );
                        getSecureObject( selectedItem.UId )
                            .done( ( data: any ) => {
                                if ( parentUId ) {
                                    selectTreeItem( parentUId );
                                }
                                else {
                                    clearTreeSelection();
                                }
                                // reset UId, override ParentUId, UniqueName
                                data.Data.UId = null;
                                data.Data.ParentUId = parentUId;
                                data.Data.UniqueName = `New ${parentUId ? "Child" : "Root"} (copy of ${data.Data.UniqueName})`;
                                populateEditor( data );
                            } )
                            .fail( () => { } );
                    } else {
                        // make prev node the selected node
                        //selectSecureObjectTreeNode();
                        selectTreeItem();
                    }
                } );
            }
            break;

    }
}
function clearTreeSelection() {
    k$soTl.clearSelection();
    setVMSelectedUId( null );
}

export function soBtnSaveClick() {
    console.log( "In soBtnSaveClick..." );
    clearEditorErrors();
    if ( validateEditor() ) {
        $.when( showProgress() )
            .then( saveSecureObject )
            .then( processSaveActionResponse )
            .always( hideProgress );
    }
}
function validateEditor() {
    console.log( "In validateEditor..." );
    let msg = "";

    if ( !validator.validate() ) {
        let errors = validator.errors();
        $( errors ).each( function () {
            msg += this + "<br/>";
        } );
    }
    // make sure the 2 grids have exited edit mode
    if ( k$soGrdDacl.table.find( "tr.k-grid-edit-row" ).length > 0 ) {
        msg += "Complete the 'Permission' section<br/>";
    }
    if ( k$soGrdSacl.table.find( "tr.k-grid-edit-row" ).length > 0 ) {
        msg += "Complete the 'Audit' section<br/>";
    }
    if ( msg.length > 0 ) {
        $soEditorError.html( msg );
        setVMEditorHasErrorFlag( true );
    }

    return ( msg.length == 0 ? true : false );
}

function saveSecureObject() {
    console.log( "In saveSecureObject..." );

    // clone the model
    let model = JSON.parse( JSON.stringify( ( soVM as any ).editor.get( "model" ) ) );
    // convert saclaudittypefilter back to a single number
    let auditTypeFilterVal = model.SaclAuditTypeFilter.reduce( function ( result: any, itemVal: any ) {
        // TODO: Put explicit type
        return result | itemVal;
    }, 0 );
    model.SaclAuditTypeFilter = auditTypeFilterVal;
    // remove property "LocalId" first
    model.Dacl = dacl.map( item => {
        return Object.keys( item )
            .reduce( ( acc, key ) => key == "LocalId" ? acc : ( { ...acc, [key]: item[key] } ), {} )

    } );
    model.Sacl = sacl.map( item => {
        return Object.keys( item )
            .reduce( ( acc, key ) => key == "LocalId" ? acc : ( { ...acc, [key]: item[key] } ), {} )

    } );

    let dfd = $.Deferred();

    $.ajax( {
        method: "POST",
        url: getActionUrl( "SaveSecureObject", "Admin" ),
        contentType: "application/json",
        data: JSON.stringify( model ),
        dataType: "json",
    } )
        .then( ( data: AjaxResponse ) => {
            if ( data.Status == AjaxResponseStatus.Success ) {
                transformData( data );
                dfd.resolve( data );
            } else {
                dfd.resolve( data );
            }
        } )
        .fail( ( jqXHR: JQueryXHR, textStatus: string ) => {
            let msg = decipherJqXhrError( jqXHR, textStatus );
            notifyError( `There is a problem saving Secure Object.<br/>${msg}` );
            dfd.reject();
        } );

    return dfd.promise();
}
function transformData( data: any ) {
    // TODO: Put explicit type
    // convert SaclAuditTypeFilter to int[] so we can bind it to the editor
    // need to convert back before sending the model back to the server for update
    // another option:
    // - Use a new property to hold the value in int[].
    // - don't touch the existing property. bind the new property to the editor
    // - before save, update the field, and delete (use the delete command) the temporary property
    let v = data.Data.SaclAuditTypeFilter;
    let arr: number[] = [];
    $.each( auditTypes, function ( index, item: any ) {
        if ( ( v & item.Id ) == item.Id ) {
            arr.push( item.Id as number );
        }
    } );
    data.Data.SaclAuditTypeFilter = arr;
    // return arr
}
function processSaveActionResponse( data: AjaxResponse ): JQueryPromise<boolean> {
    // Put explicit type
    console.log( "In processSaveActionResponse..." );
    let dfd = $.Deferred();

    if ( data.Status == AjaxResponseStatus.Success ) {

        if ( data.Data ) {
            setVMEditorHasChangesFlag( false );
            populateEditor( data );

            // update tree
            // select updated node & expand parent
            let updatedItem = data.Data;
            let ds = k$soTl.dataSource as kendo.data.TreeListDataSource;
            //let dataItem = k$soTl.dataSource.get( updatedItem.UId );
            let dataItem = ds.get( updatedItem.UId );
            if ( typeof dataItem == "undefined" ) {
                //k$soTl.dataSource.add( updatedItem );
                //is it better to use PushCreate, PushUpdate instead? https://stackoverflow.com/questions/30886733/kendo-treelist-adding-and-updating-rows
                //k$soTl.dataSource
                //ds.pushCreate( new soTlModel( {
                ds.add( new soTlModel( {
                    UId: updatedItem.UId,
                    UniqueName: updatedItem.UniqueName,
                    ParentUId: updatedItem.ParentUId,
                    IsEnabled: updatedItem.IsEnabled,
                    IsSecure: updatedItem.IsSecure,
                    DaclAllowInherit: updatedItem.DaclAllowInherit,
                    SaclAllowInherit: updatedItem.SaclAllowInherit
                } ) )
                if ( updatedItem.ParentUId ) {
                    // expand parent so item is visible
                    k$soTl.expand( k$soTl.itemFor( ds.get( updatedItem.ParentUId ) ) )
                }
            }
            else {
                dataItem.set( "UniqueName", updatedItem.UniqueName );
                dataItem.set( "ParentUId", updatedItem.ParentUId );
                dataItem.set( "IsEnabled", updatedItem.IsEnabled );
                dataItem.set( "IsSecure", updatedItem.IsSecure );
                dataItem.set( "DaclAllowInherit", updatedItem.DaclAllowInherit );
                dataItem.set( "SaclAllowInherit", updatedItem.SaclAllowInherit );
            }

            selectTreeItem( updatedItem.UId );

            notifySuccess( `Secure Object <b>${updatedItem.UniqueName}</b> saved.` );
            dfd.resolve();

        }
    } else {
        if ( data.ValidationErrors ) {
            if ( $soEditorError ) {
                let msg = "";
                $( data.ValidationErrors ).each( function () {
                    msg += this + "<br/>";
                } );
                if ( msg.length > 0 ) {
                    $soEditorError.html( msg );
                }
            }
            setVMEditorHasErrorFlag( true );
        }
        notifyError( `Unable to save Secure Object. Correct the error(s) on the form and try again.` );
        dfd.reject();
    }
    return dfd.promise();
}
export function soTbbDeleteClick() {
    // get the selected item
    let itemToDelete: any = k$soTl.dataItem( k$soTl.select() ); // TODO: Put explicit type
    if ( !itemToDelete ) return;

    $.when( showYesNoDialog( "Confirm Delete", `Are you sure you want to delete the Secure Object <b>${itemToDelete.UniqueName}</b> and all its child items?` ) )
        .then( ( response: DialogResponse ) => {
            if ( response == DialogResponse.Yes ) {
                // ok
                $.when( showProgress() )
                    .then( () => {
                        return deleteSecureObject( itemToDelete );
                    } )
                    .then( ( data: AjaxResponse ) => {
                        return processDeleteActionResponse( data, itemToDelete );
                    } )
                    .always( hideProgress );
            }
        } );
}
function deleteSecureObject( itemToDelete: any ) {
    // TODO: Put explicit type
    let dfd = $.Deferred();
    $.post( getActionUrl( "DeleteSecureObject", "Admin" ), { uId: itemToDelete.UId } )
        .then( ( data: AjaxResponse ) => {
            return dfd.resolve( data );
        } )
        .fail( ( jqXHR: JQueryXHR, textStatus: string ) => {
            let msg = decipherJqXhrError( jqXHR, textStatus );
            notifyError( `There is a problem deleting Secure Object <b>${itemToDelete.UniqueName}</b>.<br/>${msg}` );
            dfd.reject();
        } );

    return dfd.promise();
}
function processDeleteActionResponse( data: AjaxResponse, itemToDelete: any ) {
    // TODO: Put explicit type
    if ( data.Status == AjaxResponseStatus.Success ) {

        // remove item from tree
        let ds: kendo.data.TreeListDataSource = k$soTl.dataSource as kendo.data.TreeListDataSource;
        let dataItem: any = k$soTl.dataSource.get( itemToDelete.UId );
        // bug: delete parent doesn't delete descendents,so have to handle it manually
        // https://github.com/telerik/kendo-ui-core/issues/4614
        let descendents: any[] = [];
        getDescendents( dataItem, descendents );
        descendents.forEach( ( descendent: any ) => { ds.remove( descendent ) } )
        ds.remove( dataItem );

        // see if need to clean up the editor
        if ( soVM.get( "editor.visible" ) ) {
            let editorUId = soVM.get( "editor.model.UId" );
            let editorParentUId = soVM.get( "editor.model.ParentUId" );

            // clear editor if 
            // 1. it is the item that is being deleted
            // 2. OR the parent is the item that is being deleted
            if ( ( editorUId !== null && !ds.get( editorUId ) ) || ( editorParentUId !== null && !ds.get( editorParentUId ) ) ) {
                resetEditor( false );
                clearTreeSelection();
            }
        }

        notifySuccess( `Secure Object <b>${itemToDelete.UniqueName}</b> deleted successfully.` );
        return $
            .Deferred()
            .resolve()
            .promise();
    }
    else {
        notifyError( data.Message );
        return $
            .Deferred()
            .reject()
            .promise();
    }
}
function getDescendents( parent: any, descendents: any[] ) {
    let childNodes = ( k$soTl.dataSource as kendo.data.TreeListDataSource ).childNodes( parent );
    //descendents.push( childNodes );
    Array.prototype.push.apply( descendents, childNodes );
    childNodes.forEach( ( item: any ) => {
        getDescendents( item, descendents )
    } )
}
export function soBtnDiscardClick() {
    console.log( "In soBtnDiscardClick..." );

    if ( ( soVM as any ).editor.get( "hasChanges" ) ) {
        showYesNoDialog( "Confirm discard changes", "Are you sure you want to discard changes? " )
            .then( ( response: DialogResponse ) => {
                if ( response == DialogResponse.Yes ) {
                    resetEditor( false );   // should we restore the form with original record. if so get from server or keep a copy of the original record?
                }
            } );
    }
    else {
        resetEditor( false );
    }
}
function getSecureObject( uId: string ) {
    let dfd = $.Deferred();

    $.get( getActionUrl( "GetSecureObjectByUId", "Admin" ), { uId: uId } )
        .then(
            ( data: AjaxResponse ) => {
                if ( data.Status == AjaxResponseStatus.Success ) {
                    transformData( data );
                    dfd.resolve( data );
                } else {
                    notifyError( "There is a problem retrieving Secure Object" );
                    dfd.reject( data );
                }
            },
            ( jqXHR: JQueryXHR, textStatus: string ) => {
                let msg = decipherJqXhrError( jqXHR, textStatus );
                notifyError( `There is a problem retrieving Secure Object.<br/>${msg}` );
                dfd.reject();
            }
        );
    return dfd.promise();
}
function resetEditor( showEditor?: boolean ) {
    ( soVM as any ).editor.reset( showEditor );
    clearEditorErrors();
    dacl = [];
    sacl = [];
    k$soGrdDacl.dataSource.read();
    k$soGrdSacl.dataSource.read();
}
function clearEditorErrors() {
    $soEditorError.empty();
    setVMEditorHasErrorFlag( false );
    //(soVM as any).editor.setError(false);
}
function populateEditor( data: AjaxResponse ) {
    // TODO: Put explicit type
    console.log( "In populateEditor..." );
    if ( data ) {
        ( soVM as any ).editor.set( "model", data.Data );
        daclLocalId = 0;
        dacl = $.map( data.Data.Dacl, function ( record, idx ) {
            //record.LocalId = ++daclLocalId;
            //return record;
            return {
                ...record, LocalId: ++daclLocalId
            }
        } );
        k$soGrdDacl.dataSource.read();
        saclLocalId = 0;
        sacl = $.map( data.Data.Sacl, function ( record, idx ) {
            record.LocalId = ++saclLocalId;
            return record;
        } );
        k$soGrdSacl.dataSource.read();
        //k$soGrdDacl.dataSource.data(data.Data.Dacl);
        //k$soGrdSacl.dataSource.data(data.Data.Sacl);
    }
}

// ddl used inside dacl, sacl grid
function trusteeDropDownEditor( container: JQuery<HTMLElement>, options: kendo.ui.GridColumnEditorOptions ) {
    // TODO: Put explicit type
    //$( '<input name="' + options.field + '" data-bind="value:' + options.field + '" required="required"/>' )
    //let row = container.closest( "tr" );
    $( '<input name="' + options.field + '" data-bind="value:' + options.field + '" />' )
        .appendTo( container )
        .kendoDropDownList( {
            dataTextField: "Name",
            dataValueField: "UId",
            valuePrimitive: true,
            dataSource: soTrusteesDataSource
        } );
    $( '<span class="k-invalid-msg" data-for="' + options.field + '"></span>' ).appendTo( container );
}
function getTrusteeName( gridDataItem: any ) {
    // TODO: Put explicit type
    if ( gridDataItem.TrusteeUId == null ) return "";

    var trusteeLookupItem: any = soTrusteesDataSource.get( gridDataItem.TrusteeUId );
    if ( trusteeLookupItem )
        return kendo.htmlEncode( trusteeLookupItem.Name );
    else
        return "";

}

function boolEditor( container: JQuery<HTMLElement>, options: kendo.ui.GridColumnEditorOptions ) {
    // TODO: Put explicit type
    let guid = kendo.guid();
    $(
        '<input class="k-checkbox" id="' +
        guid +
        '" type="checkbox" name="' +
        options.field +
        '" data-type="boolean" data-bind="checked:' +
        options.field +
        '">'
    ).appendTo( container );
    $( '<label class="k-checkbox-label" for="' + guid + '">&#8203;</label>' ).appendTo( container );
}

function rightTypeDropDownListEditor( container: JQuery<HTMLElement>, options: kendo.ui.GridColumnEditorOptions ) {
    // TODO: Put explicit type
    console.log( "In rightTypeDropDownListEditor..." );

    //$( '<input data-bind="value:' + options.field + '" name="' + options.field + '" required="required" data-required-msg="Right Type is required"/>')
    $( '<input data-bind="value:' + options.field + '" name="' + options.field + '" />' )
        .appendTo( container )
        .kendoDropDownList( {
            dataSource: rightTypes,
            change: function ( e ) {
                options.model.set( "Right", 0 );

                let rightContainer = container.closest( "tr.k-grid-edit-row" ).find( "[data-container-for=Right]" );

                createRightCheckBoxList( rightContainer, options.model );
                kendo.bind( rightContainer, options.model );
            },
        } );
    $( '<span class="k-invalid-msg" data-for="' + options.field + '"></span>' ).appendTo( container );
}

function createRightCheckBoxList( container: JQuery<HTMLElement>, model: any ) {
    // TODO: Put explicit type
    container.empty();
    if ( model.RightType == "" ) return;

    let fieldName = "Right";
    let rightsArr = rights[model.RightType];

    let ele = '<ul class="gridEditor">';
    $.each( rightsArr, function ( index, item ) {
        ele +=
            '<li><input type="checkbox" class="k-checkbox" name="' +
            fieldName +
            '" id="' +
            fieldName +
            item.RightId +
            '" value="' +
            item.RightId +
            '" ' +
            ( ( model.Right & item.RightId ) == item.RightId ? "checked" : "" ) +
            ' /><label class="k-checkbox-label" for="' +
            fieldName +
            item.RightId +
            '" >' +
            item.RightName +
            "</label></li>";
    } );
    ele += "</ul>";
    ele += '<span class="k-invalid-msg" data-for="' + fieldName + '"></span>';
    $( ele ).appendTo( container );

    // bind to click event - don't bind to change as we don't want the handler to be called multiple times for each checkbox that is programatically checked/unchecked
    // when auto-checking, use .prop("checked", trueorfalse). don't use .trigger('click') as it will cause the click handler to be executed for every checkbox that is checked
    container.find( ".k-checkbox" ).bind( "click", function ( e: any ) {
        let cb = $( e.target );
        let bitFlag1 = parseInt( cb.val() as string );
        let isCompositeValue = !isPowerOfTwo( bitFlag1 );
        if ( cb.prop( "checked" ) ) {
            if ( isCompositeValue ) {
                // loop thru all unchecked checkboxes and see if we need to check them
                container.find( "input:checkbox:not(:checked)" ).each( function () {
                    let bitFlag2 = parseInt( $( this ).val() as string );
                    if ( ( bitFlag1 & bitFlag2 ) == bitFlag2 ) {
                        $( this ).prop( "checked", true ); // fire change(). without it kendo checkboxes will not be checked. also change() will keep binding in sync
                        //$( this ).trigger( "click" )  // dont use this. we dont want the handler to be called repeatedly
                    }
                } );
            }
        } else {
            if ( !isCompositeValue ) {
                // do nothing if the value unchecked is a composite value
                // loop thru all checked checkboxes and see which ones to uncheck
                container.find( "input:checked" ).each( function () {
                    let bitFlag2 = parseInt( $( this ).val() as string );
                    if ( ( bitFlag1 & bitFlag2 ) == bitFlag1 ) {
                        $( this ).prop( "checked", false );
                        // $( this ).trigger( 'click' )
                    }
                } );
            }
        }
        // now update the model
        let newRightVal = 0;
        container.find( "input:checked" ).each( function () {
            newRightVal |= $( this ).val() as number;
        } );
        if ( newRightVal != model.Right ) {
            model.set( "Right", newRightVal );
        }
    } );
}

function getRightAsString( dataItem: any ) {
    // TODO: Put explicit type
    let rightVal = dataItem.Right;
    let allRightsArr = rights[dataItem.RightType];
    let rightArr: string[] = [];
    while ( rightVal > 0 ) {
        $.each( allRightsArr, function ( index, item ) {
            if ( ( rightVal & item.RightId ) == item.RightId ) {
                rightArr.push( item.RightName );
                rightVal ^= item.RightId;
            }
            if ( rightVal <= 0 ) {
                return false; // break out of $.each() loop
            }
        } );
    }
    return rightArr.join( ", " );
}
function validateTrustee( input: JQuery ) {
    if ( input.is( '[name="TrusteeUId"]' ) ) {
        if ( input.val() == '' ) {
            input.attr( "data-trusteevalidation-msg", "Group is required." );
            return false;
        }
    }
    return true;
}
function validateRight( input: JQuery ) {
    if ( input.is( '[name="Right"]' ) ) {
        if ( input.closest( "td" ).find( "input[type=checkbox]:checked" ).length == 0 ) {
            input.attr( "data-rightvalidation-msg", "Select at least 1 right." );
            return false;
        } else {
            return true;
        }
    }
    return true;
}
function validateRightType( input: JQuery ) {
    if ( input.is( '[name="RightType"]' ) ) {
        // check if empty
        if ( input.val() == '' ) {
            input.attr( "data-righttypevalidation-msg", "Right Type is required." );
            return false;
        };
        // right + trusteeuid must be unique
        //to get the row dataItem for inline editing
        let row = input.closest( "tr" );
        let grid = row.closest( "[data-role=grid]" ).data( "kendoGrid" );
        let dataItem = grid.dataItem( row );

        let data = grid.dataSource.data();
        let ok = true;
        // this method of checking for unique trusteeUId + righttype only works well when following criterias are met
        // 1. grid is using inline editing mode
        // 2. grid validator's validateonblur set to false

        // Allowing validateonblur causes too many issues
        // - when you tab out of righttype and there is an error, the checkboxes in the right column is not refreshed.
        //   if the problem is with trustee, and you select a different one, the content in Right column will still not be refreshed
        // - checking across columns is also harder. We can't rely on the datasource (like what we do here). if a field is in error, the value is not written to the datasource.
        //   the value has to be retrieved from the input element

        for ( let i = 0; i < data.length; i++ ) {
            // not we are comparing "uid"
            if ( data[i].uid != dataItem.uid && data[i].TrusteeUId == ( dataItem as any ).TrusteeUId && data[i].RightType == input.val() ) {
                input.attr( "data-righttypevalidation-msg", "Group / Right Type<br/>combination must be<br/>unique" );
                ok = false;
                break;
            }
        }

        return ok;
    } else return true;
}
export function soVerifySaveChanges(): JQueryPromise<boolean> {
    console.log( "In soVerifySaveChanges..." );
    let dfd = $.Deferred();
    if ( !( soVM as any ).editor.get( "hasChanges" ) ) {
        dfd.resolve( true );
    } else {
        $.when( showYesNoCancelDialog( "Save changes", `Save changes to Secure Object <b>${( soVM as any ).editor.model.get( "UniqueName" )}</b> ?` ) )
            .then( ( response: DialogResponse ) => {
                switch ( response ) {
                    case DialogResponse.Yes: // 1: // go ahead and save
                        clearEditorErrors();
                        if ( validateEditor() ) {
                            $.when( showProgress() )
                                .then( saveSecureObject )
                                .then( processSaveActionResponse )
                                .then( () => {
                                    dfd.resolve( true );
                                } )
                                .fail( () => {
                                    dfd.resolve( false );
                                } )
                                .always( hideProgress )
                        } else {
                            // failed client validation
                            notifyError( "Please correct the error(s) on the form first." );
                            dfd.resolve( false );
                        }
                        break;
                    case DialogResponse.No: // discard changes and continue
                        resetEditor( false );
                        dfd.resolve( true );
                        break;
                    case DialogResponse.Cancel: // cancel action
                        dfd.resolve( false );
                        break;
                    default:
                        dfd.resolve( false );
                        break;
                }
            }
            );
    }

    return dfd.promise();
}

let soTlModel = kendo.data.TreeListModel.define( {
    id: "UId",
    parentId: "ParentUId",
    fields: {
        UId: { editable: false },
        UniqueName: { type: "string" },
        ParentUId: { type: "string" },
        IsEnabled: { type: "boolean" },
        IsSecure: { type: "boolean" },
        DaclAllowInherit: { type: "boolean" },
        SaclAllowInherit: { type: "boolean" }
    },
} );

function soTlClick() {
    //console.log( "In soTlClick..." );
    let selectedItem: any = k$soTl.dataItem( k$soTl.select() ); // TODO: Put explicit type
    console.log( selectedItem );

    if ( !selectedItem ) {
        return;
    }
    if ( ( soVM as any ).editor.model.get( "UId" ) == selectedItem.UId ) {
        return;
    }

    soVerifySaveChanges().then( function ( proceed: boolean ) {
        console.log( "-- " + proceed );
        if ( proceed ) {
            selectTreeItem( selectedItem.UId )
            //selectSecureObjectTreeNode( selectedItem.UId );
            resetEditor( true );

            showProgress();
            //$.when( soTrusteesDataSource.read(), getSecureObject( selectedItem.UId ) )
            //    .done( ( arg1: any, arg2: any ) => {
            //        let data = arg2;
            //        populateEditor( data );
            //    } )
            //    .fail( () => { } )
            //    .always(hideProgress);
            getSecureObject( selectedItem.UId )
                .done( populateEditor )
                .fail( () => { } )
                .always( hideProgress );
        } else {
            // make prev node the selected node
            //selectSecureObjectTreeNode();
            selectTreeItem();
        }
    } );
}

function selectTreeItem( uId?: string ) {
    if ( !uId ) {
        // if not provided take from view model
        uId = soVM.get( "selectedUId" );
    }

    let dataItem: any = k$soTl.dataSource.get( uId ); // TODO: Put explicit type
    if ( dataItem ) {
        let row: JQuery = k$soTl.itemFor( dataItem );
        if ( k$soTl.select() != row ) {
            k$soTl.select( row );
        }
        setVMSelectedUId( dataItem.UId );
    }
}

export function soTlDrop( e: any ) { // can't use kendo.ui.TreeListDropEvent. the statement e.setValid(false) will give an error
    console.log( "In soTlDrop..." );
    // if source and destination belong to the same parent, do nothing
    // else 
    // 1. cancel the move action  (we want to move it manually because we cannot know the status of the update on the server immediately)
    // 2. update server record
    // 3. if server update fail, ??
    // 4. if ok, update the item in the datasource to reflect the new parent

    //https://www.c-sharpcorner.com/article/kendo-treelist-moving-a-node-up-and-down-in-asp-net-mvc-using-javascript/
    if ( !e.valid ) return;


    const parentUId = e.destination ? e.destination.UId : null;

    // retain code for future reference. this is the way to test if a ctrl key is pressed
    //if ( e.originalEvent.ctrlKey ) {
    //    console.log( "-- copy node" );
    //} else {
    //    console.log( "-- move node" );
    //}

    // if moving to same parent, cancel the move
    // cant use e.source.ParentUId --> not sure why the datasource doesnt register ParentUId
    if ( ( !e.source.ParentUId && !parentUId ) || ( e.source.ParentUId == parentUId ) ) {
        console.log( '-- moving to same parent, cancel move' );
        e.setValid( false );
        return;
    }

    e.preventDefault(); // we will handle the move / copy manually

    $.ajax( {
        url: getActionUrl( "UpdateSecureObjectParent", "Admin" ),
        type: "POST",
        data: {
            uId: e.source.UId,
            parentUId: parentUId
        },
    } )
        .then( ( data: AjaxResponse ) => {
            let dfd = $.Deferred();
            if ( data.Status == AjaxResponseStatus.Success ) {
                // update the tree
                e.source.set( "ParentUId", parentUId );
                if ( parentUId ) {
                    let parentItem = k$soTl.dataSource.get( parentUId );
                    ( parentItem as any ).hasChildren = true;
                    ( parentItem as any ).expanded = true;
                }
                k$soTl.refresh();

                // update the editor 
                if ( ( soVM as any ).editor.model.get( "UId" ) == e.source.UId ) {
                    ( soVM as any ).editor.model.set( "ParentUId", parentUId );
                }

                dfd.resolve();
            } else {
                dfd.reject();
            }
            return dfd.promise();
        } )
        .fail( () => {
            // e.setValid( false );        // TO DO: delete? dont think this statement is needed
            notifyError( "An error has occurred while updating the parent of Secure Object" );
        } );

    //kendo.confirm( "Are you sure that you want to move " + e.source.FirstName
    //    + " under " + e.destination.FirstName + "?" ).then( function () {
    //        e.source.set( "ReportsTo", e.destination.EmployeeID );
    //        e.sender.refresh();
    //    } );


}

