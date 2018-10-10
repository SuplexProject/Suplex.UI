import * as ID from "./ids";
import debounce from "lodash-es/debounce";
import { mainVM } from "./main";
import {
    getActionUrl,
    decipherJqXhrError,
    showYesNoCancelDialog,
    showYesNoDialog,
    blockUI,
    unblockUI,
    notifyError,
    notifySuccess,
    isPowerOfTwo,
    showAlert,
    DialogResponse,
    AjaxResponse,
    AjaxResponseStatus,
} from "./utils";

let $soView = $(ID.SO_VIEW);
let $soTv = $(ID.SO_TREEVIEW);
let $soSpltr = $(ID.SO_SPLITTER);

let $soEditor = $(ID.SO_EDITOR);
let $soEditorError = $(ID.SO_EDITOR_ERROR);
let $soGrdDacl = $(ID.SO_GRD_DACL);
let $soGrdSacl = $(ID.SO_GRD_SACL);

let validator: kendo.ui.Validator = null;

let k$soTv: kendo.ui.TreeView = null;
let k$soGrdDacl: kendo.ui.Grid = null;
let k$soGrdSacl: kendo.ui.Grid = null;

let auditTypes: string[] = [];
let rightTypes: string[] = [];
let rights = {};
let secureObjectDefaults = {};

let dacl: Array<any> = [];
let sacl: Array<any> = [];

let daclLocalId: number;
let saclLocalId: number;

let dfdSecureObjectDefaults = $
    .get(getActionUrl("GetSecureObjectDefaults", "Admin"))
    .done(function(data) {
        // let arr = [];
        secureObjectDefaults = data;
        (soVM as any).editor.set("secureObjectDefaults", secureObjectDefaults);
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        let msg = decipherJqXhrError(jqXHR, textStatus);
        notifyError(`There is a problem getting information from the server.<br/>${msg}`);
    });

let dfdAuditTypes = $
    .get(getActionUrl("GetAuditTypes", "Admin"))
    .done(function(data) {
        auditTypes = data;
        (soVM as any).editor.set("auditTypes", auditTypes);
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        let msg = decipherJqXhrError(jqXHR, textStatus);
        notifyError(`There is a problem getting information from the server.<br/>${msg}`);
    });
let dfdRights = $
    .get(getActionUrl("GetRights", "Admin"))
    .done(function(data) {
        rightTypes = [];
        rights = {};
        $.each(data, function(index, item) {
            rights[item.RightType] = rights[item.RightType] || [];
            rights[item.RightType].push(item);
            if (rightTypes.indexOf(item.RightType) < 0) {
                rightTypes.push(item.RightType);
            }
        });
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        let msg = decipherJqXhrError(jqXHR, textStatus);
        notifyError(`There is a problem getting information from the server.<br/>${msg}`);
    });

// block UI to ensure data is available before user starts to use
blockUI();
$.when(dfdAuditTypes, dfdRights, dfdSecureObjectDefaults).always(unblockUI);

let _kDsTrustees = new kendo.data.DataSource({
    transport: {
        read: {
            url: getActionUrl("GetAllTrustees", "Admin"),
            dataType: "json",
        },
    },
});

let _kDsDacl = new kendo.data.DataSource({
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
            console.log( "create ds" );
            console.log( dacl );
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
                        required: true,
                    },
                },
                RightType: {
                    type: "string",
                    validation: {
                        required: true,
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
                    defaultValue: function() {
                        return secureObjectDefaults["DaclAllowed"] || false;
                    },
                },
                Inheritable: {
                    type: "boolean",
                    defaultValue: function() {
                        return secureObjectDefaults["DaclInheritable"] || false;
                    },
                },
            },
        },
    },
});

let _kDsSacl = new kendo.data.DataSource({
    //data: [],
    transport: {
        read: function ( options ) {
            options.success( sacl );
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
                        required: true,
                    },
                },
                RightType: {
                    type: "string",
                    validation: {
                        required: true,
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
                    defaultValue: function() {
                        return secureObjectDefaults["SaclAllowed"] || false;
                    },
                },
                Denied: {
                    type: "boolean",
                    defaultValue: function() {
                        return secureObjectDefaults["SaclDenied"] || false;
                    },
                },
                Inheritable: {
                    type: "boolean",
                    defaultValue: function() {
                        return secureObjectDefaults["SaclInheritable"] || false;
                    },
                },
            },
        },
    },
});

let _soEditorModel = kendo.data.Model.define({
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
            defaultValue: function() {
                return typeof secureObjectDefaults["IsEnabled"] === "boolean" ? secureObjectDefaults["IsEnabled"] : false;
            },
        },
        DaclAllowInherit: {
            type: "boolean",
            defaultValue: function() {
                return typeof secureObjectDefaults["DaclAllowInherit"] === "boolean" ? secureObjectDefaults["DaclAllowInherit"] : false;
            },
        },
        SaclAllowInherit: {
            type: "boolean",
            defaultValue: function() {
                return typeof secureObjectDefaults["SaclAllowInherit"] === "boolean" ? secureObjectDefaults["SaclAllowInherit"] : false;
            },
        },
        SaclAuditTypeFilter: {
            defaultValue: function() {
                return secureObjectDefaults["SaclAuditTypeFilterArray"] || [];
            },
        },
        Dacl: {},
        Sacl: {},
    },
});

// properties required at the point of binding the view to the ViewModel must be a concrete value
// if the property value depends on external factors and may not be available at the time of binding,
// set it to a default value first.this will allow the binding to be successful
let soVM = kendo.observable({
    visible: false,
    selectedUId: null,
    editor: {
        // fields here are used by the editor
        visible: false,
        hasChanges: false,
        hasError: false,
        model: new _soEditorModel(), // matches the model from the server
        auditTypes: [], // one time set by ajax call. use to display the audit type filter checkboxes
        daclAllowInheritTextColor: function() {
            if (this.model.get("DaclAllowInherit")) {
                return "";
            } else {
                return "#f00";
            }
        },
        saclAllowInheritTextColor: function() {
            if (this.model.get("SaclAllowInherit")) {
                return "";
            } else {
                return "#f00";
            }
        },
        reset: function(showEditor?: boolean) {
            if (showEditor == undefined) {
                showEditor = false;
            }
            if (showEditor != this.get("visible")) {
                this.set("visible", showEditor);
            }
            // this.set( "visible", false )
            this.set("hasChanges", false);
            this.set("hasError", false);
            this.set("model", new _soEditorModel());
        },
        setError: function(trueOrFalse: boolean) {
            if (this.get("hasError") == trueOrFalse) return;
            this.set("hasError", trueOrFalse);
        },
        raiseChange: function() {
            // event handler for UI elements bound to the model. fired when there are changes to the element
            let that = this;
            that.editor.set("hasChanges", true);
        },
        setSaclAuditTypeFilterToDefault: function() {
            let that = this;
            that.editor.model.set( "SaclAuditTypeFilter", secureObjectDefaults["SaclAuditTypeFilterArray"] );
            that.editor.set( "hasChanges", true );
        },
        kDsDacl: _kDsDacl, // required so we display dacl item count on the editor
        kDsSacl: _kDsSacl, // required so we display sacl item count on the editor
        daclItemCount: function() {
            return this.get("kDsDacl") ? this.get("kDsDacl").total() : 0;
        },
        saclItemCount: function() {
            return this.get("kDsSacl") ? this.get("kDsSacl").total() : 0;
        },
        securityInheritanceState: function() {
            // returns default if default setting, else modified
            if (
                this.model.get("DaclAllowInherit") == secureObjectDefaults["DaclAllowInherit"] &&
                this.model.get("SaclAllowInherit") == secureObjectDefaults["SaclAllowInherit"] &&
                this.saclAuditTypeFilterIsDefault()
            )
                return "Default";
            else return "Modified";
        },
        saclAuditTypeFilterIsDefault: function() {
            //let v = 0
            //let filterArray = this.model.get( "SaclAuditTypeFilter" )       // this is in int[] format
            //$.each( filterArray , function ( index, item ) {
            //    v |= item //parseInt(item)
            //} )
            //return ( v == secureObjectDefaults["SaclAuditTypeFilter"] )
            return (
                this.model.get("SaclAuditTypeFilter").reduce(function(result: any, itemVal: any) {
                    return result | itemVal;
                }, 0) == secureObjectDefaults["SaclAuditTypeFilter"]
            );
        },
    },
    secureObjectSelected: function() {
        return this.get("selectedUId") != null;
    },
    reset: function() {
        // this.set( "visible", false )  // visibility determined by main.js
        this.set("selectedUId", null);
        this.editor.reset();
    },
});
// functions to set view model fields
function setChange(trueorfalse: boolean) {
    if ((soVM as any).editor.get("hasChanges") == trueorfalse) return;
    (soVM as any).editor.set("hasChanges", trueorfalse);
}
function setError(trueorfalse: boolean) {
    if ((soVM as any).editor.get("hasError") == trueorfalse) return;
    (soVM as any).editor.set("hasError", trueorfalse);
}
function setSelectedUId(uId: string) {
    if (soVM.get("selectedUId") != uId) {
        soVM.set("selectedUId", uId);
    }
}
export function setupSecureObjects() {
    kendo.bind($soView, soVM);

    setupWidgets();

    setupVariables();

    setupEventHandlers();

    resetSecureObjects(); // without this data wont show up on the treeview when adding item to the datasouce right after launch
}

function setupWidgets() {
    //https://demos.telerik.com/kendo-ui/grid/editing-custom
    //https://docs.telerik.com/kendo-ui/controls/data-management/grid/how-to/Templates/grid-with-checkbox-column
    //https://community.progress.com/community_groups/openedge_kendo_ui_builder/w/openedgekendouibuilder/2923.how-to-add-a-combo-box-or-a-dropdownlist-to-a-grid-in-a-custom-view
    $soGrdDacl.kendoGrid({
        dataSource: _kDsDacl,
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
                width: "150px",
                editor: rightTypeDropDownListEditor,
            },
            {
                field: "Right",
                title: "Right",
                width: "200px",
                template: getRightAsString,
            }, // editor is created in the grid edit event. We will bind the value manually
            { field: "Allowed", title: "Allowed", width: "80px", editor: boolEditor },
            {
                field: "Inheritable",
                title: "Inheritable",
                width: "90px",
                editor: boolEditor,
            },
            {
                command: [
                    { name: "edit", text: { edit: "", update: "", cancel: "" } },
                    {
                        name: "customdelete",
                        text: "",
                        iconClass: "k-icon k-i-close",
                        click: function(e: any) {
                            e.preventDefault();
                            let tr = $(e.target).closest("tr");
                            let data = this.dataItem(tr);
                            $.when( showYesNoDialog( "Confirm Delete", "Are you sure you want to delete this permission record?" ) )
                                .then( (response: DialogResponse) => {
                                    if ( response == DialogResponse.Yes ) {
                                        // ok
                                        k$soGrdDacl.dataSource.remove(data);
                                        setChange(true);
                                    }
                                });
                        },
                    },
                ],
            },
        ],
        toolbar: [ { name: "create" } ],
        editable: "inline",
        edit: function ( e: kendo.ui.GridEditEvent ) {
            // edit event is triggered before the editor form is shown. By this time the editor UI elements are already bound to the model.
            let model = e.model;
            let container = e.container;
            let rightContainer = container.find("[data-container-for=Right]");
            createRightCheckBoxList(rightContainer, model);
            // disable validateOnBlur. Validate only when the update button is checked. This is so that the error will not stop the right checkboxes
            // from being displayed when there is a change in the right
            // https://docs.telerik.com/kendo-ui/knowledge-base/grid-disable-validation-on-blur
            delete (e.model as any)._events.set;
        },
        save: function ( e: kendo.ui.GridSaveEvent ) {
            // can also do validation here
            // and use e.preventDefault() to stop the save
            if (this.dataSource.hasChanges()) {
                // dataSource.hasChanges() is true when
                // 1. data item dirty is true( so if you clicked edit and save without doing anything, dirty will be false) or
                // 2. new item added
                // item delete has no effect on this flag
                setChange( true );
                console.log( "save clicked" );
                console.log(e)
            }
        },
        remove: function ( e: kendo.ui.GridRemoveEvent ) {
            // not triggered when we use custom command
            setChange(true);
        },
    });

    $soGrdSacl.kendoGrid({
        dataSource: _kDsSacl,
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
                width: "150px",
                editor: rightTypeDropDownListEditor,
            },
            {
                field: "Right",
                title: "Right",
                width: "200px",
                template: getRightAsString,
            }, // editor is created in the grid edit event. We will bind the value manually
            { field: "Allowed", title: "Success", width: "80px", editor: boolEditor },
            { field: "Denied", title: "Failure", width: "80px", editor: boolEditor },
            {
                field: "Inheritable",
                title: "Inheritable",
                width: "90px",
                editor: boolEditor,
            },
            {
                command: [
                    { name: "edit", text: { edit: "", update: "", cancel: "" } },
                    {
                        name: "customdelete",
                        text: "",
                        iconClass: "k-icon k-i-close",
                        click: function(e: any) {
                            e.preventDefault();
                            let tr = $(e.target).closest("tr");
                            let data = this.dataItem(tr);
                            $.when( showYesNoDialog( "Confirm Delete", "Are you sure you want to delete this audit record?" ) )
                                .then( ( response: DialogResponse ) => {
                                    if ( response == DialogResponse.Yes ) {
                                        // ok
                                        k$soGrdSacl.dataSource.remove(data);
                                        setChange(true);
                                    }
                                });
                        },
                    },
                ],
            },
        ],
        toolbar: [ { name:"create" } ],
        editable: "inline",
        edit: function( e: kendo.ui.GridEditEvent ) {
            // edit event is triggered before the editor form is shown. By this time the editor UI elements are already bound to the model.
            let model = e.model;
            let container = e.container;
            let rightContainer = container.find("[data-container-for=Right]");
            createRightCheckBoxList(rightContainer, model);
            // disable validateOnBlur. Validate only when the update button is checked. This is so that the error will not stop the right checkboxes
            // from being displayed when there is a change in the right
            // https://docs.telerik.com/kendo-ui/knowledge-base/grid-disable-validation-on-blur
            delete (e.model as any)._events.set;
        },
        save: function( e: kendo.ui.GridSaveEvent ) {
            // can also do validation here
            // and use e.preventDefault() to stop the save
            if (this.dataSource.hasChanges()) {
                // dataSource.hasChanges() is true when
                // 1. data item dirty is true( so if you clicked edit and save without doing anything, dirty will be false) or
                // 2. new item added
                // item delete has no effect on this flag
                setChange(true);
            }
        },
        remove: function ( e: kendo.ui.GridRemoveEvent) {
            // won't work if we use custom command
            setChange(true);
        },
    });

    $(ID.SO_TREEVIEW_MENU).kendoContextMenu({
        target: $(ID.SO_SPLITTER).find(".k-pane:first"),
        filter: ".k-item .k-in, .wrapper",
        open: function ( e: kendo.ui.ContextMenuOpenEvent ) {
            let ele = $(e.target);
            let ctxMnu = $(e.item);
            if (ele.hasClass("wrapper")) {
                ctxMnu.find(".node-only").hide();
            } else {
                ctxMnu.find(".node-only").show();
            }
        },
        select: function ( e: kendo.ui.ContextMenuSelectEvent ) {
            let target = $(e.target);
            switch (e.item.id) {
                case "soTvMnuNew":
                    verifySaveChanges().then(function(proceed) {
                        if (proceed) {
                            resetEditor(true);
                            if (target.hasClass("wrapper")) {
                                // not a treeview node, so create a top level node
                                deselectSecureObjectTreeNode();
                            } else {
                                let dataItem = k$soTv.dataItem(target as JQuery); // TODO: Check if the type is correct
                                selectSecureObjectTreeNode((dataItem as any).UId); // select the node pointed by the context menu
                                (soVM as any).editor.model.set("ParentUId", (dataItem as any).UId);
                            }
                        } 
                    });
                    break;
                case "soTvMnuDelete":
                    // let dataItem = k$soTv.dataItem(target as JQuery);

                    // need to incorporate verifysavechanges
                    k$soTv.select(target as JQuery);
                    k$soTv.trigger("click");
                    $(ID.SO_BTN_DELETE).trigger("click");

                    break;
                case "soTvMnuExpand":
                    // TODO: Variable was node.
                    let node1 = target.hasClass("wrapper") ? $() : target.closest(".k-item");
                    expandCollapseAll(true, node1 as JQuery);
                    break;
                case "soTvMnuCollapse":
                    // TODO: Variable was node.
                    let node2 = target.hasClass("wrapper") ? $() : target.closest(".k-item");
                    expandCollapseAll(false, node2 as JQuery);
                    break;
                case "soTvMnuPreview":
                    break;
                default:
                    break;
            }
            // remove focus from node
            setTimeout(function() {
                target.removeClass("k-state-focused");
            });
        },
    });

    validator = $soEditor
        .kendoValidator({
            validateOnBlur: false,
            validate: function ( e: kendo.ui.ValidatorValidateEvent ) {
                $("span.k-invalid-msg").hide();
            },
        })
        .data("kendoValidator");
}
function setupVariables() {
    k$soTv = $soTv.data("kendoTreeView");
    k$soGrdDacl = $soGrdDacl.data("kendoGrid");
    k$soGrdSacl = $soGrdSacl.data("kendoGrid");
}
function setupEventHandlers() {
    $(window)
        .resize(debounce(resizeSplitter, 500))
        .trigger("resize");

    $(ID.SO_TREEVIEW).on("click", ".k-item .k-in", soTvClick);
}

export function showSecureObjects() {
    if ( !soVM.get( "visible" ) ) soVM.set( "visible", true );
    resizeSplitter();
}
export function hideSecureObjects() {
    if (soVM.get("visible")) soVM.set("visible", false);
}
export function resetSecureObjects() {
    (soVM as any).reset();
    //resetEditor( false )
    k$soTv.dataSource.data([]);
}
export function loadSecureObjectsTree() {
    k$soTv.dataSource.read();
}
function resizeSplitter() {
    console.log( "In resizeSplitter..." );
    let top = 125; // height occupied above splitter
    let bottom = 25; // height occupied below splitter
    let height = $(window).height() - (top + bottom) - 1; // to stop the body scrollbar from appearing
    height = height <= 0 ? 100 : height;
    //$soSpltr.height(height);
    console.log( height );
    // let width = $( window ).width() -
    $soSpltr.data( "kendoSplitter" ).wrapper.height( height );
    $soSpltr.data("kendoSplitter").resize();
}
export function soBtnExpandAllClick() {
    // note: this only works when loadOnDemand is false
    let node = k$soTv.select();
    expandCollapseAll(true, node);
}
export function soBtnCollapseAllClick() {
    let node = k$soTv.select();
    expandCollapseAll(false, node);
}
function expandCollapseAll( expand: boolean, node: JQuery ) {
    
    if (node.length == 0) {
        expand ? k$soTv.expand(".k-item") : k$soTv.collapse(".k-item");
    } else {
        expand ? k$soTv.expand(node.find(".k-item").addBack()) : k$soTv.collapse(node.find(".k-item").addBack());
    }
}
export function soTvDataBound() {}
export function soBtnNewClick(e: any) {
    console.log( "In soBtnNewClick..." );

    switch ( "#" + e.id ) {        
        case ID.SO_BTN_NEW:
            console.log( "-- new" );
            //https://www.telerik.com/forums/open-split-button-with-js
            let $btn = $( ID.SO_BTN_NEW ).closest( '.k-split-button' );
            let popup = $btn.data( "kendoPopup" );
            console.log( popup );
            if ( popup ) {
                if ( popup.visible() ) {
                    popup.close();
                }
                else {
                    popup.open();
                }
            }
            break;

        case ID.SO_BTN_NEW_ROOT:
        case ID.SO_BTN_NEW_CHILD:

            verifySaveChanges().then( function ( proceed ) {
                if ( proceed ) {
                    // go ahead and prepare the editor
                    resetEditor( true );
                    // if there is a selected node, set the parent of the model
                    // else assume new root
                    if ( "#" + e.id == ID.SO_BTN_NEW_CHILD && soVM.get( "selectedUId" ) != null ) {
                        ( soVM as any ).editor.model.set( "ParentUId", soVM.get( "selectedUId" ) );
                    }
                    else {
                        // clear node selection
                        deselectSecureObjectTreeNode();
                    }
                }
            } );
            break;

    }
}
function deselectSecureObjectTreeNode() {
    k$soTv.select( $() );
    soVM.set( "selectedUId", null );
}

export function soBtnEditClick() {
    console.log( "In soBtnEditClick..." );

    let selectedNode: JQuery = k$soTv.select();
    let dataItem:any = k$soTv.dataItem( selectedNode );
    if ( dataItem ) {
        console.log( selectedNode )
        if ( !( soVM as any ).editor.get( "visible" ) || ( soVM as any ).editor.model.get( "UId" ) !== dataItem.UId ) {
            console.log('edit btn trgger click')
            selectedNode.find(".k-in").first().trigger( "click" );
        }
    }    
}
export function soBtnSaveClick() {
    console.log("In soBtnSaveClick...");
    clearEditorErrors();
    if (validateEditor()) {
        $.when(blockUI)
            .then(saveSecureObject)
            .then(processSaveActionResponse)
            .always(unblockUI);
    }
}
function validateEditor() {
    console.log("In validateEditor...");
    let ok;

    // make sure the 2 grids have exited edit mode
    if (k$soGrdDacl.table.find("tr.k-grid-edit-row").length > 0 || k$soGrdSacl.table.find("tr.k-grid-edit-row").length > 0) {
        showAlert("Alert", "<p style='text-align:center;width:400px;'>Complete the 'Permission' and 'Audit' sections first before you save.</p>");
        ok = false;
    } else {
        ok = validator.validate();
        if (!ok) {
            let errors = validator.errors();
            let msg = "";
            $(errors).each(function() {
                msg = this + "<br/>";
            });
            if (msg.length > 0) {
                $soEditorError.html(msg);
            }
            (soVM as any).editor.setError(true);
        }
    }
    return ok;
}

function saveSecureObject() {
    console.log("In saveSecureObject...");

    // clone the model
    let model = JSON.parse(JSON.stringify((soVM as any).editor.get("model")));
    // convert saclaudittypefilter back to a single number
    let auditTypeFilterVal = model.SaclAuditTypeFilter.reduce(function(result: any, itemVal: any) {
        // TODO: Put explicit type
        return result | itemVal;
    }, 0);
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

    $.ajax({
        method: "POST",
        url: getActionUrl("SaveSecureObject", "Admin"),
        contentType: "application/json",
        data: JSON.stringify(model),
        dataType: "json",
    })
        .then( (data: AjaxResponse) => {
            if (data.Status == AjaxResponseStatus.Success) {
                transformData(data);
                dfd.resolve(data);
            } else {
                dfd.resolve(data); // need to pass error message from the server to the UI
            }
        })
        .fail( ( jqXHR: JQueryXHR, textStatus: string ) => {
            let msg = decipherJqXhrError(jqXHR, textStatus);
            notifyError(`There is a problem saving Secure Object.<br/>${msg}`);
            dfd.reject();
        });

    return dfd.promise();
}
function transformData(data: any) {
    // TODO: Put explicit type
    // convert SaclAuditTypeFilter to int[] so we can bind it to the editor
    // need to convert back before sending the model back to the server for update
    // another option:
    // - Use a new property to hold the value in int[].
    // - don't touch the existing property. bind the new property to the editor
    // - before save, update the field, and delete (use the delete command) the temporary property
    let v = data.Data.SaclAuditTypeFilter;
    let arr: number[] = [];
    $.each(auditTypes, function(index, item: any) {
        if ((v & item.Id) == item.Id) {
            arr.push(item.Id as number);
        }
    });
    data.Data.SaclAuditTypeFilter = arr;
    // return arr
}

function processSaveActionResponse(data: AjaxResponse) {
    // Put explicit type
    console.log("In processSaveActionResponse...");
    let dfd = $.Deferred();

    if (data.Status == AjaxResponseStatus.Success) {
        (mainVM as any).setChange(true);

        let model = null;
        if (data.Data) {
            model = data.Data;
        }
        if (model) {
            setChange(false);
            populateEditor(data);
            // update tree
            // select updated node & expand parents

            // add/update just the root node. then sort
            $.get(getActionUrl("GetSecureObjectTreeItem", "Admin"), {
                uId: data.Data.UId,
            })
                .then(updatedItem => {
                    let dsItem = k$soTv.dataSource.get(updatedItem.UId);

                    if (typeof dsItem == "undefined") {
                        if (updatedItem.ParentUId == null) {
                            // append as root node, no need to specifically call sort as root level sorting will use the sort configuration
                            k$soTv.append({
                                UId: updatedItem.UId,
                                UniqueName: updatedItem.UniqueName,
                                IsEnabled: updatedItem.IsEnabled,
                                ParentUId: updatedItem.ParentUId,
                                HasChildren: updatedItem.HasChildren,
                                IsDefaultSecuritySettings: updatedItem.IsDefaultSecuritySettings
                            });
                        } else {
                            // append as a child of some node
                            let dsItem = k$soTv.dataSource.get(updatedItem.ParentUId);
                            let parentEle = k$soTv.findByUid(dsItem.uid);
                            k$soTv.append(
                                {
                                    UId: updatedItem.UId,
                                    UniqueName: updatedItem.UniqueName,
                                    IsEnabled: updatedItem.IsEnabled,
                                    ParentUId: updatedItem.ParentUId,
                                    HasChildren: updatedItem.HasChildren,
                                    IsDefaultSecuritySettings: updatedItem.IsDefaultSecuritySettings
                                },
                                parentEle
                            );
                            // sort that specific level only
                            (dsItem as any).children.sort({ field: "UniqueName", dir: "asc" }); // TODO: Put explicit type
                        }
                    } else {
                        // existing node, just update
                        dsItem.set( "UniqueName", updatedItem.UniqueName );
                        dsItem.set( "IsEnabled", updatedItem.IsEnabled );
                        dsItem.set( "ParentUId", updatedItem.ParentUId );
                        dsItem.set( "HasChildren", updatedItem.HasChildren );
                        dsItem.set( "IsDefaultSecuritySettings", updatedItem.IsDefaultSecuritySettings );
                    }

                    selectSecureObjectTreeNode(data.Data.UId);
                    // ( mainVM as any ).setChange( true );
                    notifySuccess( `Secure Object ${data.Data.UniqueName} saved successfully.` );
                    dfd.resolve(); //dfd.resolve(data);
                })
                .fail( () => {
                    notifyError( "Error encountered while trying to update secure object tree node" );
                    dfd.reject(); //dfd.reject(data);
                }); // should notify error
        }
    } else {
        if (data.ValidationErrors) {
            if ($soEditorError) {
                let msg = "";
                $(data.ValidationErrors).each(function() {
                    msg += this + "<br/>";
                });
                if (msg.length > 0) {
                    $soEditorError.html(msg);
                }
            }
            setError(true);
        }
        notifyError(data.Message);
        dfd.reject(); //dfd.reject(data);
    }
    return dfd.promise();
}

//function expandSecureObjectTreeParent( nodeElement ) {
//    let parent = k$soTv.parent( nodeElement );
//    while ( parent && parent.length > 0 ) {
//        k$soTv.expand( parent );
//        parent = k$soTv.parent( parent );
//    }
//}
export function soBtnDeleteClick() {
    // get the selected item
    let itemToDelete: any = k$soTv.dataItem(k$soTv.select()); // TODO: Put explicit type
    if (!itemToDelete) return;

    $.when( showYesNoDialog( "Confirm Delete", `Are you sure you want to delete the Secure Object ${itemToDelete.UniqueName} and all its child items?` ) )
        .then( ( response: DialogResponse ) => {
            if ( response == DialogResponse.Yes ) {
                // ok
                $.when(blockUI)
                    .then( () => {
                        return deleteSecureObject(itemToDelete);
                    })
                    .then( (data: AjaxResponse) => {
                        return processDeleteActionResponse(data, itemToDelete);
                    }) // if success: resolve(), else reject()
                    //.then(function() {
                    //    notifySuccess("Secure Object " + itemToDelete.UniqueName + " deleted successfully.");
                    //})
                    .always(unblockUI);
            }
        });
}
function deleteSecureObject(itemToDelete: any) {
    // TODO: Put explicit type
    let dfd = $.Deferred();
    $.post(getActionUrl("DeleteSecureObject", "Admin"), { uId: itemToDelete.UId })
        .then( (data:AjaxResponse) => {
            return dfd.resolve( data );
        })
        .fail((jqXHR: JQueryXHR, textStatus: string) => {
            let msg = decipherJqXhrError(jqXHR, textStatus);
            notifyError(`There is a problem deleting Secure Object ${itemToDelete.UniqueName}.<br/>${msg}`);
            dfd.reject();
        });

    return dfd.promise();
}
function processDeleteActionResponse(data: AjaxResponse, itemToDelete: any) {
    // TODO: Put explicit type
    if (data.Status == AjaxResponseStatus.Success) {
        (mainVM as any).setChange(true);
        resetEditor(true);
        // remove item from tree
        let dataItem = k$soTv.dataSource.get(itemToDelete.UId);
        k$soTv.dataSource.remove(dataItem);
        setSelectedUId(null);
        //soVM.set( "selectedUId", null )

        // check what happens to the selected item? the selectedUId in the VM
        notifySuccess( `Secure Object ${itemToDelete.UniqueName} deleted successfully.` );
        return $
            .Deferred()
            .resolve()
            .promise();
    } else {
        notifyError(data.Message);
        return $
            .Deferred()
            .reject()
            .promise();
    }
}
export function soBtnDiscardClick() {
    console.log("In soBtnDiscardClick...");

    showYesNoDialog( "Confirm discard changes", "Are you sure you want to discard changes? " )
        .then( (response: DialogResponse) => {
            if ( response == DialogResponse.Yes ) {
                resetEditor( true );
            }
        } );
    //verifySaveChanges().then(function(proceed) {
    //    if (proceed) {
    //        resetEditor(true);
    //    }
    //});
}

// use click event and (MUST) leave treeview change and select methods empty
// too difficult to manage/control the events
function soTvClick() {
    // this event comes after treeview select and change events
    console.log("In soTvClick...");
    let selectedItem: any = k$soTv.dataItem(k$soTv.select()); // TODO: Put explicit type

    if (!selectedItem) {
        return;
    }
    if ((soVM as any).editor.model.get("UId") == selectedItem.UId) {
        return;
    }

    verifySaveChanges().then( function ( proceed: boolean ) {
        console.log("-- " + proceed);
        if (proceed) {
            selectSecureObjectTreeNode(selectedItem.UId);
            resetEditor(true);

            // let name = selectedItem.UniqueName;
            $.when(_kDsTrustees.read(), getSecureObject(selectedItem.UId))
                .done( (arg1: any, arg2: any) => {
                    //let data = arg2[0]
                    let data = arg2;
                    populateEditor(data);
                })
                .fail( () => {} );
        } else {
            // make prev node the selected node
            selectSecureObjectTreeNode();
        }
    });
}
export function soTvDrag( e: kendo.ui.TreeViewDragEvent ) {
    // TODO: Put explicit type
    // disallow if dropping to the same parent
    let srcParent = this.dataItem(this.parent(e.sourceNode));
    if (e.statusClass == "i-plus") {
        let tgtParent = this.dataItem(e.dropTarget);
        if (srcParent == tgtParent) {
            e.setStatusClass("k-i-cancel");
            return;
        }
    } else if (e.statusClass.indexOf("insert") >= 0) {
        let tgtParent = this.dataItem(this.parent(e.dropTarget));
        if (srcParent == tgtParent) {
            e.setStatusClass("k-i-cancel");
            return;
        }
    }
}

export function soTvDrop( e: any ) { 
    // TODO: Put explicit type
    // at this stage, the node is not yet registered with the new destination.
    if (!e.valid) return;

    // need to provide copy node functionality
    // test if it is a move or copy
    if (e.originalEvent.ctrlKey) {
        console.log("copy node");
    } else {
        console.log("move node");
    }

    //let copyNode: boolean = e.originalEvent.ctrlKey ? true : false;

    // update server
    let tree = e.sender; // this
    let sourceItem = tree.dataItem(e.sourceNode);
    let destinationItem = tree.dataItem(e.destinationNode);
    let position = e.dropPosition;
    let parentItem = destinationItem;
    if (position != "over") {
        parentItem = parentItem.parentNode();
    }
    let sourceNode = $(e.sourceNode);
    let destinationNode = $(e.destinationNode);
    e.preventDefault(); // handle the move manually after a successful update on the server

    $.ajax({
        url: getActionUrl("UpdateSecureObjectParent", "Admin"),
        type: "POST",
        data: {
            uId: sourceItem.id,
            parentUId: parentItem ? parentItem.id : null,
        },
    })
        .then( ( data: AjaxResponse ) => {
            let dfd = $.Deferred();
            if (data.Status == AjaxResponseStatus.Success) {
                sourceItem.set("ParentUId", parentItem ? parentItem.id : null);
                if (position == "over") {
                    tree.append( sourceNode as JQuery, destinationNode as JQuery );
                } else {
                    tree.insertAfter( sourceNode, destinationNode as JQuery ); // it doesn't matter whether insertAfter or insertBefore. We are going to sort it
                }
                setTimeout(function() {
                    sortSecureObjectTreeNode(parentItem);
                }, 0);

                (mainVM as any).setChange(true);
                dfd.resolve();
            } else {
                dfd.reject();
            }
            return dfd.promise();
        })
        .fail( () => {
            e.setValid(false);
            notifyError("An error has occurred while updating parent of Secure Object");
        });

    // sort
    //let tree = e.sender
    //let dataSource = tree.dataSource
    //setTimeout( function () {
    //    //sortSecureObjectTree( dataSource.view() ) // this one sorts the whole tree
    //    sortSecureObjectTreeNode(parent)
    //}, 0 );
}
function sortSecureObjectTreeNode(parentNode: kendo.data.Node) {
    // TODO: Put explicit type
    console.log("sort parent node:", parentNode)
    if (parentNode) {
        parentNode.children.sort( { field: "UniqueName", dir: "asc" } );
    } else {
        // looks like it is smart enough to use the sort config
    }
}
// sorts the whole tree
//function sortSecureObjectTree( items ) {
//    for ( let i = 0; i < items.length; i++ ) {
//        if ( items[i].hasChildren ) {
//            items[i].children.sort( { field: "UniqueName", dir: "asc" } );
//            sortSecureObjectTreeNode( items[i].children.view() );
//        }
//    }
//}
function selectSecureObjectTreeNode(uId?: string) {
    if (!uId) {
        // if not provided take from view model
        uId = soVM.get("selectedUId");
    }

    let dataItem: any = k$soTv.dataSource.get(uId); // TODO: Put explicit type
    if (dataItem) {
        k$soTv.expandTo(dataItem);
        let nodeElement = k$soTv.findByUid(dataItem.uid);
        if (nodeElement) {
            k$soTv.select(nodeElement); 
        }
    }
    setSelectedUId(dataItem.UId);
}

function getSecureObject(uId: string) {
    let dfd = $.Deferred();

    $.get( getActionUrl( "GetSecureObjectByUId", "Admin" ), { uId: uId } )
        .then(
            ( data: AjaxResponse ) => {
                if (data.Status == AjaxResponseStatus.Success) {
                    transformData(data);
                    dfd.resolve(data);
                } else {
                    notifyError("There is a problem retrieving Secure Object");
                    dfd.reject(data);
                }
            },
            ( jqXHR: JQueryXHR, textStatus: string ) => {
                    let msg = decipherJqXhrError(jqXHR, textStatus);
                    notifyError(`There is a problem retrieving Secure Object.<br/>${msg}`);
                    dfd.reject();
            }
        );
    return dfd.promise();
}
function resetEditor(showEditor?: boolean) {
    (soVM as any).editor.reset(showEditor);
    clearEditorErrors();
    dacl = [];
    sacl = [];
    k$soGrdDacl.dataSource.read();
    k$soGrdSacl.dataSource.read();
}
function clearEditorErrors() {
    $soEditorError.empty();
    (soVM as any).editor.setError(false);
}
function populateEditor(data: AjaxResponse) {
    // TODO: Put explicit type
    console.log("In populateEditor...");
    if (data) {
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

// TODO: Check if this is indeed unused function
// not sure to use this or the datasource
// function getAllTrustees() {

//     let dfd = $.Deferred();

//     $.get( getActionUrl( "GetAllTrustees", "Admin" ) )
//         .done( function ( data ) {
//             _allTrustees = data;
//             dfd.resolve();
//         } )
//         .fail( function ( jqXHR, textStatus, errorThrown ) {
//             let msg = decipherJqXhrError( jqXHR, textStatus );
//             notifyError( "There is a problem retrieving trustees" + "<br/>" + msg );
//             dfd.reject();
//         } );

//     return dfd.promise();
// }

// ddl used inside dacl, sacl grid
function trusteeDropDownEditor(container: JQuery<HTMLElement>, options: kendo.ui.GridColumnEditorOptions) {
    // TODO: Put explicit type
    //$( '<input name="' + options.field + '" data-bind="value:' + options.field + '" required="required"/>' )
    $('<input name="' + options.field + '" data-bind="value:' + options.field + '" required="required"/>')
        .appendTo(container)
        .kendoDropDownList({
            dataTextField: "Name",
            dataValueField: "UId",
            valuePrimitive: true,
            dataSource: {
                dataType: "json",
                transport: {
                    read: getActionUrl("GetAllTrustees", "Admin"),
                },
            },
        });
    $('<span class="k-invalid-msg" data-for="' + options.field + '"></span>').appendTo(container);
}
function getTrusteeName(dataItem: any) {
    // TODO: Put explicit type
    if (dataItem.TrusteeUId == null) return "";

    // TODO: Check filter item, which does not match the definition.
    _kDsTrustees.filter({
        field: "UId",
        operation: "eq",
        value: dataItem.TrusteeUId,
    } as kendo.data.DataSourceFilterItem);
    let view = _kDsTrustees.view();
    if (view.length == 0) return "";
    let name = view[0].Name;
    _kDsTrustees.filter({}); // clear filter
    return kendo.htmlEncode(name);
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
    ).appendTo(container);
    $('<label class="k-checkbox-label" for="' + guid + '">&#8203;</label>').appendTo(container);
}

function rightTypeDropDownListEditor( container: JQuery<HTMLElement>, options: kendo.ui.GridColumnEditorOptions ) {
    // TODO: Put explicit type
    console.log("In rightTypeDropDownListEditor...");
    //let guid = kendo.guid()
    // options.model --> returns the row data item. to access a field, use options.model.<fieldname>

    $('<input data-bind="value:' + options.field + '" name="' + options.field + '" required="required" />')
        .appendTo(container)
        .kendoDropDownList({
            dataSource: rightTypes,
            change: function(e) {
                options.model.set("Right", 0);

                let rightContainer = container.closest("tr.k-grid-edit-row").find("[data-container-for=Right]");

                createRightCheckBoxList(rightContainer, options.model);
                kendo.bind(rightContainer, options.model);
            },
        });
    $('<span class="k-invalid-msg" data-for="' + options.field + '"></span>').appendTo(container);
}

function createRightCheckBoxList( container: JQuery<HTMLElement>, model: any ) {
    // TODO: Put explicit type
    container.empty();
    if (model.RightType == "") return;

    let fieldName = "Right";
    let rightsArr = rights[model.RightType];

    let ele = '<ul class="gridEditor">';
    $.each(rightsArr, function(index, item) {
        ele +=
            '<li><input type="checkbox" class="k-checkbox" name="' +
            fieldName +
            '" id="' +
            fieldName +
            item.RightId +
            '" value="' +
            item.RightId +
            '" ' +
            ((model.Right & item.RightId) == item.RightId ? "checked" : "") +
            ' /><label class="k-checkbox-label" for="' +
            fieldName +
            item.RightId +
            '" >' +
            item.RightName +
            "</label></li>";
    });
    ele += "</ul>";
    ele += '<span class="k-invalid-msg" data-for="' + fieldName + '"></span>';
    $(ele).appendTo(container);

    // bind to click event - don't bind to change as we don't want the handler to be called multiple times for each checkbox that is programatically checked/unchecked
    // when auto-checking, use .prop("checked", trueorfalse). don't use .trigger('click') as it will cause the click handler to be executed for every checkbox that is checked
    container.find(".k-checkbox").bind("click", function(e: any) {
        let cb = $(e.target);
        let bitFlag1 = parseInt(cb.val() as string);
        let isCompositeValue = !isPowerOfTwo(bitFlag1);
        if (cb.prop("checked")) {
            if (isCompositeValue) {
                // loop thru all unchecked checkboxes and see if we need to check them
                container.find("input:checkbox:not(:checked)").each(function() {
                    let bitFlag2 = parseInt($(this).val() as string);
                    if ((bitFlag1 & bitFlag2) == bitFlag2) {
                        $(this).prop("checked", true); // fire change(). without it kendo checkboxes will not be checked. also change() will keep binding in sync
                        //$( this ).trigger( "click" )  // dont use this. we dont want the handler to be called repeatedly
                    }
                });
            }
        } else {
            if (!isCompositeValue) {
                // do nothing if the value unchecked is a composite value
                // loop thru all checked checkboxes and see which ones to uncheck
                container.find("input:checked").each(function() {
                    let bitFlag2 = parseInt($(this).val() as string);
                    if ((bitFlag1 & bitFlag2) == bitFlag1) {
                        $(this).prop("checked", false);
                        // $( this ).trigger( 'click' )
                    }
                });
            }
        }
        // now update the model
        let newRightVal = 0;
        container.find("input:checked").each(function() {
            newRightVal |= $(this).val() as number;
        });
        if (newRightVal != model.Right) {
            model.set("Right", newRightVal);
        }
    });
}

function getRightAsString(dataItem: any) {
    // TODO: Put explicit type
    let rightVal = dataItem.Right;
    let allRightsArr = rights[dataItem.RightType];
    let rightArr: string[] = [];
    while (rightVal > 0) {
        $.each(allRightsArr, function(index, item) {
            if ((rightVal & item.RightId) == item.RightId) {
                rightArr.push(item.RightName);
                rightVal ^= item.RightId;
            }
            if (rightVal <= 0) {
                return false; // break out of $.each() loop
            }
        });
    }
    return rightArr.join(", ");
}
function validateRight(input: JQuery) {
    if (input.is('[name="Right"]')) {
        if (input.closest("td").find("input[type=checkbox]:checked").length == 0) {
            input.attr("data-rightvalidation-msg", "Select at least 1 right");
            return false;
        } else {
            return true;
        }
    }
    return true;
}
function validateRightType(input: JQuery) {
    if (input.is('[name="RightType"]')) {
        // right + trusteeuid must be unique
        //to get the row dataItem for inline editing
        let row = input.closest("tr");
        let grid = row.closest("[data-role=grid]").data("kendoGrid");
        let dataItem = grid.dataItem(row);

        let data = grid.dataSource.data();
        let ok = true;
        // this method of checking for unique trusteeUId + righttype only works well when following criterias are met
        // 1. grid is using inline editing mode
        // 2. validator's validateonblur set to false. We had bind a custom validator to the grid as grid's default validator has validateonblur = true

        // Allowing validateonblur causes too many issues
        // - when you tab out of righttype and there is an error, the checkboxes in the right column is not refreshed.
        //   if the problem is with trustee, and you select a different one, the content in Right column will still not be refreshed
        // - checking across columns is also harder. We can't rely on the datasource (like what we do here). if a field is in error, the value is not written to the datasource.
        //   the value has to be retrieved from the input element

        for (let i = 0; i < data.length; i++) {
            // not we are comparing "uid"
            if (data[i].uid != dataItem.uid && data[i].TrusteeUId == (dataItem as any).TrusteeUId && data[i].RightType == input.val()) {
                input.attr("data-righttypevalidation-msg", "Group / Right Type<br/>combination must be<br/>unique");
                ok = false;
                break;
            }
        }

        return ok;
    } else return true;
}
export function verifySaveChanges() {
    console.log("In verifySaveChanges...");
    let dfd = $.Deferred();
    if (!(soVM as any).editor.get("hasChanges")) {
        dfd.resolve(true);
    } else {
        $.when( showYesNoCancelDialog( "Save changes", `Save changes to Secure Object ${( soVM as any ).editor.model.get( "UniqueName" )} ?` ) )
            .then((response: DialogResponse) => {
                switch (response) {
                    case DialogResponse.Yes: // 1: // go ahead and save
                        clearEditorErrors();
                        if (validateEditor()) {
                            $.when(blockUI)
                                .then(saveSecureObject)
                                .then(processSaveActionResponse)
                                .then( () => {
                                    dfd.resolve(true);
                                })
                                .fail( () => {
                                    dfd.resolve(false);
                                })
                                .always(unblockUI);
                        } else {
                            // failed client validation
                            notifyError("Please correct the error(s) on the form first.");
                            dfd.resolve(true);
                        }
                        break;
                    case DialogResponse.No: // 2: // discard changes and continue
                        dfd.resolve(true);
                        break;
                    case DialogResponse.Cancel: // 3: // cancel action
                        dfd.resolve(false);
                        break;
                    default:
                        dfd.resolve(false);
                        break;
                }
            }
        );
    }

    return dfd.promise();
}
