import differenceBy from "lodash-es/differenceBy"; // gives you a smaller size than doing import difference from 'lodash'. It seems you can do the same thing with ES6 using Array.filter
import debounce from "lodash-es/debounce";
import * as ID from "./ids";
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
    DialogResponse,
    AjaxResponse,
    AjaxResponseStatus
} from "./utils";

let $spView = $(ID.SP_VIEW);
let $spSpltr = $(ID.SP_SPLITTER);
let $spGrd = $(ID.SP_GRID);
let $spEditor = $(ID.SP_EDITOR);
let $spEditorError = $(ID.SP_EDITOR_ERROR);
let $spLbMemberOf = $(ID.SP_LISTBOX_MEMBER_OF);
let $spLbNotMemberOf = $(ID.SP_LISTBOX_NOT_MEMBER_OF);
let $spLbMembers = $(ID.SP_LISTBOX_MEMBERS);
let $spLbNonMembers = $(ID.SP_LISTBOX_NON_MEMBERS);
let $spTlGroupHierarchy = $(ID.SP_TREELIST_GROUP_HIERARCHY);
let $spTxtMemberOfFilter = $(ID.SP_TXT_MEMBER_OF_FILTER);
let $spTxtNotMemberOfFilter = $(ID.SP_TXT_NOT_MEMBER_OF_FILTER);
let $spTxtMembersFilter = $(ID.SP_TXT_MEMBERS_FILTER);
let $spTxtNonMembersFilter = $(ID.SP_TXT_NON_MEMBERS_FILTER);
let $spTxtGrdFilter: JQuery; // value set in setupVariables 

let validator: kendo.ui.Validator = null;

let k$spGrd: kendo.ui.Grid = null;
let k$spLbMemberOf: kendo.ui.ListBox = null;
let k$spLbNotMemberOf: kendo.ui.ListBox = null;
let k$spLbMembers: kendo.ui.ListBox = null;
let k$spLbNonMembers: kendo.ui.ListBox = null;
let k$spTlGroupHierarchy: kendo.ui.TreeList = null;

let memberOfOriginal: any[] = [];
let membersOriginal: any[] = [];

let spEditorModel = kendo.data.Model.define({
    id: "UId",
    fields: {
        UId: { editable: false },
        Name: {
            type: "string",
            validation: { required: true },
        },
        Description: { type: "string" },
        IsBuiltIn: { type: "boolean" },
        IsUser: { type: "boolean" },
        IsEnabled: { type: "boolean" },
        IsLocal: { type: "boolean" },
        Mask: { type: "string" },
    },
});

let spGridModel = kendo.data.Model.define({
    id: "UId",
    fields: {
        UId: { editable: false },
        Name: { type: "string" },
        Description: { type: "string" },
        IsUser: { type: "boolean" },
        IsEnabled: { type: "boolean" },
        IsLocal: { type: "boolean" },
        Source: { type: "string" },
    },
});

let spVM = kendo.observable({
    visible: false,
    selectedUId: null,
    editor: {
        visible: false,
        hasChanges: false,
        hasError: false,
        model: null,
        isLocalGroup: function() {
            if (this.get("model")) {
                return !this.model.get("IsUser") && this.model.get("IsLocal");
            } else {
                return false;
            }
        },
        reset: function(showEditor: boolean) {
            if (showEditor == undefined) {
                showEditor = false;
            }
            if (showEditor != this.get("visible")) {
                this.set("visible", showEditor);
            }
            
            this.set("hasChanges", false);
            this.set("hasError", false);
            this.set("model", new spEditorModel());
        },
        raiseChange: function() {
            let that = this;
            if (that.editor.get("hasChanges")) return;
            that.editor.set("hasChanges", true);
        },
    },
    securityPrincipalSelected: function() {
        return this.get("selectedUId") != null;
    },
    reset: function() {
        // this.set( "visible", false )  // visible property determined by main.js
        this.set("selectedUId", null);
        this.editor.reset();
    },
});

// functions to set view model fields
function setError(trueorfalse: boolean) : void {
    if ((spVM as any).editor.get("hasError") == trueorfalse) return;
    (spVM as any).editor.set("hasError", trueorfalse);
}
function setChange(trueorfalse: boolean) : void {
    if ((spVM as any).editor.get("hasChanges") == trueorfalse) return;
    (spVM as any).editor.set("hasChanges", trueorfalse);
}

export function setupSecurityPrincipals() : void {
    kendo.bind($spView, spVM);

    setupWidgets();

    setupVariables();

    setupEventHandlers();
}

function setupWidgets() : void {
    $spLbMemberOf.kendoListBox({
        dataSource: [],
        connectWith: "spLbNotMemberOf",
        toolbar: {
            tools: ["transferTo", "transferFrom"],
            position: "right",
        },
        //draggable: true,      // true allows items within the same listbox to be reordered. we don't want that as we want items to be sorted
        dropSources: ["spLbNotMemberOf"],
        dataTextField: "Name",
        dataValueField: "UId",
        template:
            "<div class='#: IsEnabled ? \"\" : \"k-state-disabled\" #'><span class='#=SUPLEXUI.getSecurityPrincipalIconClass(IsUser, IsLocal, IsEnabled) #'></span><span>#: Name #</span></div>",
        add: spLbMemberOfAdd,
        remove: spLbMemberOfRemove,
    });

    $spLbNotMemberOf.kendoListBox({
        dataSource: [],
        dataTextField: "Name",
        dataValueField: "UId",
        template:
            "<div class='#: IsEnabled ? \"\" : \"k-state-disabled\" #'><span class='#=SUPLEXUI.getSecurityPrincipalIconClass(IsUser, IsLocal, IsEnabled) #'></span><span>#: Name #</span></div>",
        //draggable: true,      // true allows items within the same listbox to be reordered. we don't want that as we want items to be sorted
        dropSources: ["spLbMemberOf"],
        add: spLbNotMemberOfAdd,
    });

    $spLbMembers.kendoListBox({
        dataSource: [],
        connectWith: "spLbNonMembers",
        toolbar: {
            tools: ["transferTo", "transferFrom"],
            position: "right",
        },
        draggable: true, // true allows items within the same listbox to be reordered. we don't want that as we want items to be sorted
        dropSources: ["spLbNonMembers"],
        dataTextField: "Name",
        dataValueField: "UId",
        template:
            "<div class='#: IsEnabled ? \"\" : \"k-state-disabled\" #'><span class='#=SUPLEXUI.getSecurityPrincipalIconClass(IsUser, IsLocal, IsEnabled) #'></span><span>#: Name #</span></div>",
        add: spLbMembersAdd,
        remove: spLbMembersRemove,
    });

    $spLbNonMembers.kendoListBox({
        dataSource: [],
        dataTextField: "Name",
        dataValueField: "UId",
        template:
            "<div class='#: IsEnabled ? \"\" : \"k-state-disabled\" #'><span class='#=SUPLEXUI.getSecurityPrincipalIconClass(IsUser, IsLocal, IsEnabled) #'></span><span>#: Name #</span></div>",
        draggable: true, // true allows items within the same listbox to be reordered. we don't want that as we want items to be sorted
        dropSources: ["spLbMembers"],
        add: spLbNonMembersAdd,
    });

    validator = $spEditor
        .kendoValidator({
            validateOnBlur: false,
            validate: function() {
                $("span.k-invalid-msg").hide();
            },
        })
        .data("kendoValidator");

    $spTlGroupHierarchy.kendoTreeList({
        dataSource: {
            data: [],
            schema: {
                model: {
                    id: "MemberUId",
                    parentId: "GroupUId",
                    fields: {
                        MemberUId: { type: "string", nullable: false },
                        GroupUId: { type: "string", nullable: true },
                    },
                },
            },
        },
        columns: [{ field: "Name" }, { field: "Description" }],
        selectable: true,
    });
}

function setupEventHandlers() : void {
    // need to test on IE 11
    $(window)
        .resize(debounce(resizeSplitter, 500))
        .trigger("resize");

    // click comes after grid change event
    $spGrd.on("click", "tbody tr", spGrdClick);

    // security principals filter
    $spTxtGrdFilter.on("input", function(e) {
        e.preventDefault();
        //var value = $(e.target).val()
        let searchString = $(this).val() as string;
        if (searchString.length > 0) {
            // there is text
            k$spGrd.dataSource.filter({
                field: "Name",
                operator: "contains",
                value: searchString,
            });
        } else {
            k$spGrd.dataSource.filter({});
        }
    });
    // member of filter
    $spTxtMemberOfFilter.on("input", function(e) {
        e.preventDefault();
        let searchString = $(this).val() as string;
        if (searchString.length > 0) {
            k$spLbMemberOf.dataSource.filter({
                field: "Name",
                operator: "contains",
                value: searchString,
            });
        } else {
            k$spLbMemberOf.dataSource.filter({});
        }
    });
    // not member of filter
    $spTxtNotMemberOfFilter.on("input", function(e) {
        e.preventDefault();
        let searchString = $(this).val() as string;
        if (searchString.length > 0) {
            k$spLbNotMemberOf.dataSource.filter({
                field: "Name",
                operator: "contains",
                value: searchString,
            });
        } else {
            k$spLbNotMemberOf.dataSource.filter({});
        }
    });
    // members filter
    $spTxtMembersFilter.on("input", function(e) {
        e.preventDefault();
        let searchString = $(this).val() as string;
        if (searchString.length > 0) {
            k$spLbMembers.dataSource.filter({
                field: "Name",
                operator: "contains",
                value: searchString,
            });
        } else {
            k$spLbMembers.dataSource.filter({});
        }
    });
    // non members filter
    $spTxtNonMembersFilter.on("input", function(e) {
        e.preventDefault();
        let searchString = $(this).val() as string;
        if (searchString.length > 0) {
            k$spLbNonMembers.dataSource.filter({
                field: "Name",
                operator: "contains",
                value: searchString,
            });
        } else {
            k$spLbNonMembers.dataSource.filter({});
        }
    });
}

function setupVariables() {
    $spTxtGrdFilter = $( ID.SP_TXT_GRD_FILTER );
    k$spGrd = $spGrd.data("kendoGrid");
    k$spLbMemberOf = $spLbMemberOf.data("kendoListBox");
    k$spLbNotMemberOf = $spLbNotMemberOf.data("kendoListBox");
    k$spLbMembers = $spLbMembers.data("kendoListBox");
    k$spLbNonMembers = $spLbNonMembers.data("kendoListBox");
    k$spTlGroupHierarchy = $spTlGroupHierarchy.data("kendoTreeList");
}

function resizeSplitter() {
    console.log("In resizeSplitter...");
    let top = 125; // height occupied above splitter
    let bottom = 25; // height occupied below splitter
    let height = $(window).height() - (top + bottom) - 1;
    height = height <= 0 ? 100 : height;
    //$spSpltr.height(height);
    console.log( height );
    //$spSpltr.trigger( "resize" )
    //$spSpltr.data('kendoSplitter').trigger( "resize" )
    $spSpltr.data( "kendoSplitter" ).wrapper.height( height );
    $spSpltr.data("kendoSplitter").resize(true);
}
export function resetSecurityPrincipals() : void {
    (spVM as any).reset();
    resetEditor(false);
    k$spGrd.dataSource.data([]);
}
export function showSecurityPrincipals() : void {
    if ( !spVM.get( "visible" ) ) spVM.set( "visible", true );
    resizeSplitter();
}

export function hideSecurityPrincipals() : void {
    if (spVM.get("visible")) spVM.set("visible", false);
}

export function loadSecurityPrincipals() : void {
    let ds = k$spGrd.dataSource;
    ds.read();
}

function spGrdClick() : void {
    console.log("In spGrdClick...");

    // var selectedItem = e.sender.dataItem(this.select())
    // click event is triggered after change event. so by now we would have the selected row
    let selectedItem: any = k$spGrd.dataItem(k$spGrd.select()); // or k$spGrd.select()[0] ? // TODO: Put explicit type
    console.log(selectedItem);

    if (!selectedItem) return;

    if (spVM.get("selectedUId") == selectedItem.UId && selectedItem.UId == (spVM as any).editor.model.get("UId")) {
        return;
    }
    /// changes start here
    verifySaveChanges().then(function(proceed) {
        console.log("-- " + proceed);
        if (proceed) {
            selectSecurityPrincipalGridItem(selectedItem.UId); // verifySaveChanges() could have cleared/changed the selection
            resetEditor(true);
            spVM.set("selectedUId", selectedItem.UId);
            (spVM as any).editor.model.set("IsUser", selectedItem.IsUser); // to ensure the correct view is displayed
            let promise : JQueryXHR;
            if (selectedItem.IsUser) {
                promise = getUser(selectedItem.UId);
            } else {
                promise = getGroup(selectedItem.UId);
            }
            promise
                .done((data: AjaxResponse) => {
                    if (data.Status == AjaxResponseStatus.Success) {
                        populateEditor(data);
                    } else {
                        notifyError(`There is a problem retrieving ${selectedItem.IsUser ? "user" : "group"} information.`);
                    }
                })
                .fail(function() {
                    // TODO: Original parameters - jqXHR?, textStatus?, errorThrown?
                    notifyError(`There is a problem retrieving ${selectedItem.IsUser ? 'user' : 'group'} information.`);
                });
        } else {
            // restore previous grid selection
            selectSecurityPrincipalGridItem(spVM.get("selectedUId"));
        }
    });
}

export function verifySaveChanges() : JQueryPromise<boolean> {
    console.log("In verifySaveChanges...");
    let dfd = $.Deferred<boolean>();

    if (!(spVM as any).editor.get("hasChanges")) {
        dfd.resolve(true);
    } else {
        let isEditingUser = (spVM as any).editor.model.get("IsUser");
        let message = "Save changes to " + (isEditingUser ? "User " : "Group ") + (spVM as any).editor.model.get("Name") + "?";
        $.when( showYesNoCancelDialog( "Save changes", message ) )
            .then( ( response: DialogResponse ): void => {
                console.log("-- Response is " + response);
                switch (response) {
                    case DialogResponse.Yes: // go ahead and save
                        clearEditorErrors();
                        if (validateEditor()) {                        
                            if ( isEditingUser ) {
                                $.when( blockUI )
                                    .then( saveUser )
                                    .then( processSaveActionResponse )
                                    .then( () => {
                                        dfd.resolve( true );
                                    } )
                                    .fail( () => {
                                        dfd.resolve( false );
                                    } )
                                    .always( unblockUI );

                            } else {
                                $.when( blockUI )
                                    .then( saveGroup )
                                    .then( processSaveActionResponse )
                                    .then( () => {
                                        dfd.resolve( true );
                                    } )
                                    .fail( () => {
                                        dfd.resolve( false );
                                    } )
                                    .always( unblockUI );
                            }

                            //promise
                            //    .then(function(data) {
                            //        return checkResponseStatus(data, $spEditorError);
                            //    }) // resolve(data), reject(data)
                            //    .then(updateUIPostSave)
                            //    .then(
                            //        function(data) {
                            //            // success callback

                            //            // notify user of successful save
                            //            if (isEditingUser) notifySaveUserOK(data);
                            //            else notifySaveGroupOK(data);

                            //            dfd.resolve(true);
                            //        },
                            //        function(jqXHR, textStatus, errorThrown) {
                            //            // failure callback

                            //            // notify user of error
                            //            if (isEditingUser) notifySaveUserFailed(jqXHR, textStatus, errorThrown);
                            //            else notifySaveGroupFailed(jqXHR, textStatus, errorThrown);

                            //            dfd.resolve(false);
                            //        }
                            //    )
                            //    .always(unblockUI);
                        } else {
                            // failed client validation
                            notifyError("Please correct the error(s) on the form first.");
                            dfd.resolve(false);
                        }
                        break;

                    case DialogResponse.No: // discard changes and continue
                        dfd.resolve(true);

                        break;

                    case DialogResponse.Cancel: // cancel action
                        dfd.resolve(false);

                        break;

                    default:
                        dfd.resolve(false);

                        break;
            }
        });
    }

    return dfd.promise();
}

function populateEditor(data: AjaxResponse) : void {
    // TODO: Put explicit type
    console.log("In populateEditor...");
    if (data) {
        if (data.Data.User) {
            (spVM as any).editor.set("model", data.Data.User);
            memberOfOriginal = JSON.parse(JSON.stringify(data.Data.MemberOf)); // clone
            k$spLbMemberOf.dataSource.data(data.Data.MemberOf);
            k$spLbNotMemberOf.dataSource.data(data.Data.NotMemberOf);
        } else if (data.Data.Group) {
            (spVM as any).editor.set("model", data.Data.Group);
            membersOriginal = JSON.parse(JSON.stringify(data.Data.Members)); // clone
            k$spLbMembers.dataSource.data(data.Data.Members);
            k$spLbNonMembers.dataSource.data(data.Data.NonMembers);
            k$spTlGroupHierarchy.dataSource.data(data.Data.GroupHierarchy);
        }
    }
}
function resetEditor(showEditor: boolean) : void {
    (spVM as any).editor.reset(showEditor);
   
    k$spLbMemberOf.dataSource.data([]);
    k$spLbNotMemberOf.dataSource.data([]);
    k$spLbMembers.dataSource.data([]);
    k$spLbNonMembers.dataSource.data([]);
    clearEditorErrors();
    memberOfOriginal = [];
    membersOriginal = [];
}

export function getSecurityPrincipalIconClass(IsUser: boolean, IsLocal: boolean, IsEnabled: boolean) : string {
    let cls = IsUser ? "icon-user" : IsLocal ? "icon-group" : "icon-group-ext";
    return "k-sprite " + cls + (IsEnabled ? "" : " k-state-disabled");
}

export function spBtnSaveClick() : void {
    // TODO: Put explicit type
    console.log("In spBtnSaveClick...");
    if ((spVM as any).editor.model.get("IsUser")) {
        clearEditorErrors();
        if ( validateEditor() ) {
            $.when( blockUI )
                .then( saveUser )
                .then( processSaveActionResponse )
                .always(unblockUI);
        }
    } else {
        //do the same for group
        clearEditorErrors();
        if ( validateEditor() ) {
            $.when( blockUI )
                .then( saveGroup )
                .then( processSaveActionResponse )
                .always(unblockUI);
        }
    }
}
function processSaveActionResponse( data: AjaxResponse ) : JQueryPromise<void> {
    console.log( "In processSaveActionResponse..." );
    let dfd = $.Deferred<void>();
    if ( data.Status == AjaxResponseStatus.Success ) {
        ( mainVM as any ).setChange( true );

        let model = null;
        if ( data.Data.User ) {
            spVM.set( "selectedUId", data.Data.User.UId );
            model = data.Data.User;
        } else if ( data.Data.Group ) {
            spVM.set( "selectedUId", data.Data.Group.UId );
            model = data.Data.Group;
        }
        if ( model ) {
            setChange( false );
            ( spVM as any ).editor.set( "model", model );
            updateSecurityPrincipalsGrid(
                new spGridModel( {
                    UId: model.UId,
                    Name: model.Name,
                    Description: model.Description,
                    IsEnabled: model.IsEnabled,
                    IsUser: model.IsUser,
                    IsLocal: model.IsLocal,
                    Source: model.IsUser ? "User" : model.IsLocal ? "Suplex" : "External",
                } )
            );
            notifySuccess( `${ model.IsUser ? 'User' : 'Group' } ${model.Name} saved successfully.` );
            dfd.resolve(); 
        }
    }
    else {
        if ( data.ValidationErrors ) {
            if ( $spEditorError ) {
                let msg = "";
                $( data.ValidationErrors ).each( function () {
                    msg += this + "<br/>";
                } );
                if ( msg.length > 0 ) {
                    $spEditorError.html( msg );
                }
            }
            setError( true );
        }
        notifyError( data.Message );
        dfd.reject(); 
    }
    return dfd.promise();
}

//function notifySaveUserOK(data: any) {
//    // TODO: Put explicit type
//    console.log("In notifySaveUserOK...");
//    notifySuccess("User " + data.Data.User.Name + " saved successfully.");
//    return true;
//}
//function notifySaveUserFailed(jqXHR: any, textStatus: string, errorThrown?: any) {
//    // TODO: Put explicit type
//    console.log("In notifySaveUserFailed...");
//    if (jqXHR.Data.User) {
//        // reject because of form error
//        notifyError(jqXHR.Data.Message);
//    } else {
//        // reject because of ajax call
//        let msg = decipherJqXhrError(jqXHR, textStatus);
//        notifyError("An error has occurred while saving User." + "<br/>" + "Error: " + msg);
//    }
//    return false;
//}
//function notifySaveGroupOK(data: any) {
//    // TODO: Put explicit type
//    console.log("In notifySaveGroupOK...");
//    notifySuccess("Group " + data.Data.Group.Name + " saved successfully.");
//    return true;
//}
//function notifySaveGroupFailed(jqXHR: any, textStatus: string, errorThrown?: any) {
//    // TODO: Put explicit type
//    console.log("In notifySaveGroupFailed...");
//    if (jqXHR.Data.Group) {
//        // reject because of form error
//        notifyError(jqXHR.Data.Message);
//    } else {
//        // reject from ajax call
//        let msg = decipherJqXhrError(jqXHR, textStatus);
//        notifyError("An error has occurred while saving Group." + "<br/>" + "Error: " + msg);
//    }

//    return false;
//}
//function checkResponseStatus(data: any, $formErrorContainer?: JQuery) {
//    console.log("In checkResponseStatus...");
//    if (data.Status != constants.SUCCESS) {
//        if (data.ValidationErrors) {
//            if ($formErrorContainer) {
//                let msg = "";
//                $(data.ValidationErrors).each(function() {
//                    console.log(this);
//                    msg += this + "<br/>";
//                });
//                if (msg.length > 0) {
//                    $formErrorContainer.html(msg);
//                }
//            }
//            setError(true);
//        }
//        return $.Deferred().reject(data);
//    } else {
//        return $.Deferred().resolve(data);
//    }
//}

//function updateUIPostSave(data: any) {
//    // TODO: Put explicit type
//    console.log("In updateUIPostSave...");

//    (mainVM as any).setChange(true);

//    let model = null;
//    if (data.Data.User) {
//        spVM.set("selectedUId", data.Data.User.UId);
//        model = data.Data.User;
//    } else if (data.Data.Group) {
//        spVM.set("selectedUId", data.Data.Group.UId);
//        model = data.Data.Group;
//    }
//    if (model) {
//        setChange(false);
//        (spVM as any).editor.set("model", model);
//        updateSecurityPrincipalsGrid(
//            new spGridModel({
//                UId: model.UId,
//                Name: model.Name,
//                Description: model.Description,
//                IsEnabled: model.IsEnabled,
//                IsUser: model.IsUser,
//                IsLocal: model.IsLocal,
//                Source: model.IsUser ? "User" : model.IsLocal ? "Suplex" : "External",
//            })
//        );
//    }
//    return $.Deferred().resolve(data);
//}
function saveUser() : JQueryPromise<AjaxResponse> {
    console.log("In saveUser...");
    // JSON.parse(JSON.stringify()) will clone and remove all the unnecessary functions wrapped inside the array by the kendo widget
    // but it looks like it is not necessary. lodash's differenceBy still works
    // var memberOf = JSON.parse( JSON.stringify( k$spLbMemberOf.dataSource.data() ) )
    let memberOf = k$spLbMemberOf.dataSource.data();
    let toAdd = differenceBy(memberOf, memberOfOriginal, "UId");
    let toRemove = differenceBy(memberOfOriginal, memberOf, "UId");
    return $.ajax( {
        method: "POST",
        url: getActionUrl( "SaveUser", "Admin" ),
        contentType: "application/json",
        data: JSON.stringify( {
            User: ( spVM as any ).editor.get( "model" ),
            MembersOfToAdd: toAdd,
            MembersOfToRemove: toRemove,
        } ),
        dataType: "json",
    } )
        .then( (data: AjaxResponse) => { return $.Deferred().resolve( data ) } )
        .fail( ( jqXHR: JQueryXHR, textStatus: string ) => {
            let msg = decipherJqXhrError( jqXHR, textStatus );
            notifyError( `There is a problem saving User.<br/>${msg}` )
            return $.Deferred().reject();
        } );
}

function saveGroup() : JQueryPromise<AjaxResponse> {
    console.log("In saveGroup...");
    let members = k$spLbMembers.dataSource.data();
    let toAdd = [];
    let toRemove = [];
    if ((spVM as any).editor.model.get("IsLocal")) {
        toAdd = differenceBy(members, membersOriginal, "UId");
        toRemove = differenceBy(membersOriginal, members, "UId");
    }
    
    return $.ajax( {
        method: "POST",
        url: getActionUrl( "SaveGroup", "Admin" ),
        contentType: "application/json",
        data: JSON.stringify( {
            Group: ( spVM as any ).editor.get( "model" ),
            MembersToAdd: toAdd,
            MembersToRemove: toRemove,
        } ),
        dataType: "json",
    } )
        .then( (data: AjaxResponse) => { return $.Deferred().resolve( data ) } )
        .fail( ( jqXHR: JQueryXHR, textStatus: string ) => {
            let msg = decipherJqXhrError( jqXHR, textStatus );
            notifyError( `There is a problem saving Group.<br/>${msg}` )
            return $.Deferred().reject();
        } );    
}

function validateEditor() : boolean {
    console.log("In validateEditor...");
    let ok = validator.validate();
    if (!ok) {
        let errors = validator.errors();
        let msg = "";
        $(errors).each(function() {
            msg = this + "<br/>";
        });
        if (msg.length > 0) {
            $spEditorError.html(msg);
        }
        setError(true);
    }
    return ok;
}

function selectSecurityPrincipalGridItem(uId: string) : void {
    if (!uId) return;

    console.log("In selectSecurityPrincipalGridItem...");

    let ds = k$spGrd.dataSource;

    // explanation from kendo support
    // the grid table row data-uid reflects the uid of the underlying ObservableObject representing the data item
    // in the grid datasoure. The uid is generated on the fly when an object is created.
    // each time the grid datasource is refreshed, the uid values change because the ObservableObjects
    // are re-created with the new data. These uids are not implemented to match the model Id in the datasource

    // if is already selected, don't select again
    let currentSelectedItem: any = k$spGrd.dataItem(k$spGrd.select()); // TODO: Put explicit type
    if (currentSelectedItem) if (currentSelectedItem.UId == uId) return;

    let rowuid = ds.get(uId).uid;
    // console.log("-- Locating row uid " + rowuid)
    let foundrow = k$spGrd.table.find('tr[data-uid="' + rowuid + '"]');
    if (foundrow.length > 0) {
        // console.log("-- Found grid item with UId " + uId)
        k$spGrd.select(foundrow);
    } else {
        k$spGrd.clearSelection();
        console.log("-- Cannot locate grid item with UId " + uId);
    }
}
function updateSecurityPrincipalsGrid(gridModel: any) : void {
    // TODO: Put explicit type
    console.log("In updateSecurityPrincipalsGrid...");
    console.log(gridModel);

    let ds = k$spGrd.dataSource;

    // pushUpdate doesn't seem to work well
    // ds.pushUpdate( gridModel )

    // if using set method, to hide the dirty indicators, follow https://docs.telerik.com/kendo-ui/knowledge-base/disable-dirty-indicator-using-css
    let dataItem = ds.get(gridModel.UId);
    if (typeof dataItem !== "undefined") {
        dataItem.set("Name", gridModel.Name);
        dataItem.set("Description", gridModel.Description);
        dataItem.set("IsEnabled", gridModel.IsEnabled);
        dataItem.set("IsUser", gridModel.IsUser);
        dataItem.set("IsLocal", gridModel.IsLocal);
        dataItem.set("Source", gridModel.Source);
    } else {
        // assume new record
        ds.add(gridModel);
        console.log("-- New item added to security principals grid");
    }

    // above action will cause grid selection to clear
    selectSecurityPrincipalGridItem(gridModel.UId);
}
function clearEditorErrors() : void {
    //$spEditorError.empty()
    $spEditorError.empty();
    setError(false);
}

export function spBtnDiscardClick() : void {
    // TODO: Put explicit type
    console.log("In spBtnDiscardClick...");

    showYesNoDialog( "Confirm discard changes", "Are you sure you want to discard changes? " )
        .then( (response: DialogResponse) => {
            if ( response == DialogResponse.Yes ) {
                resetEditor( true );
            }
        } );

    //verifySaveChanges().then(function(proceed) {
    //    if (proceed) {
    //        resetEditor(false);
    //    }
    //});
}


export function spBtnNewClick(e: any): void {
    console.log( "In spBtnNewClick..." );

    switch ( "#" + e.id ) {
        case ID.SP_BTN_NEW:
            console.log( "-- new" );
            //https://www.telerik.com/forums/open-split-button-with-js
            let $btn = $( ID.SP_BTN_NEW ).closest( '.k-split-button' );
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

        case ID.SP_BTN_NEW_USER: 
            console.log( "-- new user" );
            newUser();
            break;

        case ID.SP_BTN_NEW_GROUP:
            console.log( "-- new group" );
            newGroup();
            break;
    }
}

function newUser(): void {
    // TODO: Put explicit type
    

    verifySaveChanges().then( function ( proceed ) {
        //console.log( "-- Verify save changes return value: " + proceed )

        if ( proceed ) {
            // go ahead and prepare the editor
            resetEditor( true );
            ( spVM as any ).editor.model.set( "IsUser", true ); // ensures the user view is displayed
            getNewUser()
                .done( ( data: AjaxResponse ) => {
                    if ( data.Status == AjaxResponseStatus.Success ) {
                        populateEditor( data );
                    } else {
                        notifyError( "Error retrieving information for new user" );
                    }
                } )
                .fail( ( jqXHR: JQueryXHR, textStatus: string ) => {
                    let errorMsg = decipherJqXhrError( jqXHR, textStatus );
                    notifyError( errorMsg );
                } );
            //.always( function () {
            //    // unselect grid?
            //} )
        }
    } );
}
function newGroup() : void {
    // TODO: Put explicit type
    

    verifySaveChanges().then(function(proceed) {
        //console.log( "-- Verify save changes return value: " + proceed )

        if (proceed) {
            // go on and prepare the editor
            resetEditor(true);
            (spVM as any).editor.model.set("IsUser", false); // to make sure the correct fields are displayed
            getNewGroup()
                .done((data: AjaxResponse) => {
                    if (data.Status == AjaxResponseStatus.Success) {
                        populateEditor(data);
                    } else {
                        notifyError("Error retrieving information for new group");
                    }
                })
                .fail( ( jqXHR: JQueryXHR, textStatus: string ) => {
                    let errorMsg = decipherJqXhrError(jqXHR, textStatus);
                    notifyError(errorMsg);
                });
            //.always( function () {
            //    // unselect grid?
            //} )
        }
    });
}
export function spBtnEditClick() : void {
    console.log( "In spBtnEditClick..." );

    let selectedItem: JQuery = k$spGrd.select();
    let dataItem: any = k$spGrd.dataItem( selectedItem ); 

    if ( dataItem ) {
        if ( !( spVM as any ).editor.get( "visible" ) || ( spVM as any ).editor.model.get( "UId" ) !== dataItem.UId ) {
            selectedItem.trigger( "click" );
        }
    } 
}

export function spBtnDeleteClick() : void {
    // TODO: Put explicit type
    console.log("In spBtnDeleteClick...");

    // get the selected item
    let itemToDelete: any = k$spGrd.dataItem(k$spGrd.select()); // TODO; Put explicit type
    if (!itemToDelete) return;

    let message = `Are you sure you want to delete ${itemToDelete.IsUser ? "User " : "Group "} ${itemToDelete.Name} ?`;

    let action = itemToDelete.IsUser ? "DeleteUser" : "DeleteGroup";
    $.when( showYesNoDialog( "Confirm Delete", message ) )
        .then( ( response: DialogResponse ) => {
            if ( response == DialogResponse.Yes ) {
                // ok
                $.when( blockUI )
                    .then( () => {
                        return $.post( getActionUrl( action, "Admin" ), { uId: itemToDelete.UId } )
                            .then( data => {
                                return $.Deferred().resolve( data );
                            } )
                            .fail( ( jqXHR: JQueryXHR, textStatus: string ) => {
                                let msg = decipherJqXhrError( jqXHR, textStatus );
                                notifyError( `There is a problem deleting Secure Object ${itemToDelete.UniqueName}.<br/>${msg}` );
                                $.Deferred().reject();
                            } );
                    } )
                    .then( (data:AjaxResponse) => {
                        return processDeleteActionResponse( data, itemToDelete );
                    } )
                    .always( unblockUI );
            }
        });
}

function processDeleteActionResponse( data: AjaxResponse, gridDataItemToDelete: any ) : JQueryPromise<void> {
    if ( data.Status == AjaxResponseStatus.Success ) {
        let ds: kendo.data.DataSource = k$spGrd.dataSource;
        ds.remove( gridDataItemToDelete );
        spVM.set("selectedUId", null);

        // reset editor 
        resetEditor(true);

        ( mainVM as any ).setChange( true );

        notifySuccess( `${gridDataItemToDelete.IsUser ? 'User' : 'Group' } ${gridDataItemToDelete.Name} deleted successfully.` );
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
//function updateUIPostDelete(gridDataItem: any) {
//    // TODO: Put explicit type
//    // remove item from grid
//    let ds = k$spGrd.dataSource;
//    ds.remove(gridDataItem);
//    spVM.set("selectedUId", null);

//    // reset editor & hide it
//    resetEditor(false);

//    (mainVM as any).setChange(true);

//    return true;
//}

function getUser(uId: string) : JQueryXHR {
    return $.ajax({
        method: "GET",
        url: getActionUrl("GetUserByUId", "Admin"),
        data: { uId: uId },
        dataType: "json",
    });
}
function getNewUser() : JQueryXHR {
    return $.ajax({
        method: "GET",
        url: getActionUrl("GetNewUser", "Admin"),
        dataType: "json",
    });
}
function getGroup(uId: string) : JQueryXHR {
    console.log("In getGroup...");

    return $.ajax({
        method: "GET",
        url: getActionUrl("GetGroupByUId", "Admin"),
        data: { uId: uId },
        dataType: "json",
    });
}
function getNewGroup() : JQueryXHR {
    return $.ajax({
        method: "GET",
        url: getActionUrl("GetNewGroup", "Admin"),
        dataType: "json",
    });
}

function spLbMemberOfAdd( e: kendo.ui.ListBoxAddEvent ) {
    //help on how to auto sort
    //https://github.com/telerik/kendo-ui-core/blob/master/docs/knowledge-base/listbox-sort-items-on-add.md
    console.log("In spLbMemberOfAdd...");
    e.preventDefault();
    this.dataSource.data().push(e.dataItems[0]);
    this.dataSource.sort({ field: "Name", dir: "asc" });
    setChange(true);
}
function spLbMemberOfRemove( e: kendo.ui.ListBoxRemoveEvent ) {
    setChange(true);
}

function spLbNotMemberOfAdd( e: kendo.ui.ListBoxAddEvent ) {
    console.log("In spLbNotMemberOfAdd...");
    e.preventDefault();
    this.dataSource.data().push(e.dataItems[0]);
    this.dataSource.sort({ field: "Name", dir: "asc" });
}

function spLbMembersAdd( e: kendo.ui.ListBoxAddEvent ) {
    //help on how to auto sort
    //https://github.com/telerik/kendo-ui-core/blob/master/docs/knowledge-base/listbox-sort-items-on-add.md
    console.log("In spLbMembersAdd...");
    e.preventDefault();
    this.dataSource.data().push(e.dataItems[0]);
    this.dataSource.sort({ field: "Name", dir: "asc" });
    setChange(true);
}

function spLbMembersRemove( e: kendo.ui.ListBoxRemoveEvent ) {
    setChange(true);
}

function spLbNonMembersAdd( e: kendo.ui.ListBoxAddEvent ) {
    console.log("In spLbNonMembersAdd...");
    e.preventDefault();
    this.dataSource.data().push(e.dataItems[0]);
    this.dataSource.sort({ field: "Name", dir: "asc" });
}
