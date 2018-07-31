import differenceBy from 'lodash-es/differenceBy';   // gives you a smaller size than doing import difference from 'lodash'. It seems you can do the same thing with ES6 using Array.filter
import debounce from 'lodash-es/debounce';
import * as ID from "./ids";
import * as constants from "./constants";
import { mainVM } from "./main";
import { getActionUrl, decipherJqXhrError, showYesNoCancelDialog, showYesNoDialog, blockUI, unblockUI, notifyError, notifyInfo, notifySuccess } from "./utils";

var _$spView = $(ID.SP_VIEW);
var _$spSpltr = $(ID.SP_SPLITTER);
var _$spGrd = $(ID.SP_GRID);
var _$spEditor = $(ID.SP_EDITOR);
var _$spEditorError = $(ID.SP_EDITOR_ERROR);
var _$spLbMemberOf = $(ID.SP_LISTBOX_MEMBER_OF);
var _$spLbNotMemberOf = $(ID.SP_LISTBOX_NOT_MEMBER_OF);
var _$spLbMembers = $(ID.SP_LISTBOX_MEMBERS);
var _$spLbNonMembers = $(ID.SP_LISTBOX_NON_MEMBERS);
var _$spTlGroupHierarchy = $(ID.SP_TREELIST_GROUP_HIERARCHY);
var _$spTxtGrdFilter = $(ID.SP_TXT_GRD_FILTER);
var _$spTxtMemberOfFilter = $(ID.SP_TXT_MEMBER_OF_FILTER);
var _$spTxtNotMemberOfFilter = $(ID.SP_TXT_NOT_MEMBER_OF_FILTER);
var _$spTxtMembersFilter = $(ID.SP_TXT_MEMBERS_FILTER);
var _$spTxtNonMembersFilter = $(ID.SP_TXT_NON_MEMBERS_FILTER);

var _validator;

var _k$spGrd = null;
var _k$spLbMemberOf = null;
var _k$spLbNotMemberOf = null;
var _k$spLbMembers = null;
var _k$spLbNonMembers = null;
var _k$spTlGroupHierarchy = null;

var _memberOfOriginal = [];
var _membersOriginal = [];

var _spEditorModel = kendo.data.Model.define({
    id: "UId",
    fields: {
        UId: { editable: false },
        Name: {
            type: "string", validation: { required: true }
        },
        Description: { type: "string" },
        IsBuiltIn: { type: "boolean" },
        IsUser: { type: "boolean" },
        IsEnabled: { type: "boolean" },
        IsLocal: { type: "boolean" },
        Mask: { type: "string" }
    }
});

var _spGridModel = kendo.data.Model.define({
    id: "UId",
    fields: {
        UId: { editable: false },
        Name: { type: "string" },
        Description: { type: "string" },
        IsUser: { type: "boolean" },
        IsEnabled: { type: "boolean" },
        IsLocal: { type: "boolean" },
        Source: { type: "string" }
    }
});

var spVM: any = kendo.observable({
    visible: false,
    selectedUId: null,
    editor: {
        visible: false,
        hasChanges: false,
        hasError: false,
        model: null,
        isLocalGroup: function () {
            if (this.get("model")) {
                return (!this.model.get("IsUser") && this.model.get("IsLocal"));
            }
            else {
                return false;
            }
        },
        reset: function (showEditor) {
            if (showEditor == undefined) {
                showEditor = false;
            }
            if (showEditor != this.get("visible")) {
                this.set("visible", showEditor);
            }
            // this.set( "visible", false ) 
            this.set("hasChanges", false);
            this.set("hasError", false);
            this.set("model", new _spEditorModel());
        },
        raiseChange: function (e) {
            var that = this;
            if (that.editor.get("hasChanges")) return;
            that.editor.set("hasChanges", true);
        }
    },
    securityPrincipalSelected: function () {
        return (this.get("selectedUId") != null);
    },
    reset: function () {
        // this.set( "visible", false )  // visible property determined by main.js
        this.set("selectedUId", null);
        this.editor.reset();
    }
});

// functions to set view model fields
function setError(trueorfalse) {
    if (spVM.editor.get("hasError") == trueorfalse) return;
    spVM.editor.set("hasError", trueorfalse);
}
function setChange(trueorfalse) {
    if (spVM.editor.get("hasChanges") == trueorfalse) return;
    spVM.editor.set("hasChanges", trueorfalse);
}
function showEditor(show) {
    if (spVM.editor.get("visible") == show) return;
    spVM.editor.set("visible", show);
}

export function setupSecurityPrincipals() {
    kendo.bind(_$spView, spVM);

    setupWidgets();

    setupVariables();

    setupEventHandlers();

}

function setupWidgets() {

    _$spLbMemberOf.kendoListBox({
        dataSource: [],
        connectWith: "spLbNotMemberOf",
        toolbar: {
            tools: ["transferTo", "transferFrom"],
            position: "right"
        },
        //draggable: true,      // true allows items within the same listbox to be reordered. we don't want that as we want items to be sorted
        dropSources: ["spLbNotMemberOf"],
        dataTextField: "Name",
        dataValueField: "UId",
        template: "<div class='#: IsEnabled ? \"\" : \"k-state-disabled\" #'><span class='#=SUPLEXUI.getSecurityPrincipalIconClass(IsUser, IsLocal, IsEnabled) #'></span><span>#: Name #</span></div>",
        add: spLbMemberOfAdd,
        remove: spLbMemberOfRemove
    });

    _$spLbNotMemberOf.kendoListBox({
        dataSource: [],
        dataTextField: "Name",
        dataValueField: "UId",
        template: "<div class='#: IsEnabled ? \"\" : \"k-state-disabled\" #'><span class='#=SUPLEXUI.getSecurityPrincipalIconClass(IsUser, IsLocal, IsEnabled) #'></span><span>#: Name #</span></div>",
        //draggable: true,      // true allows items within the same listbox to be reordered. we don't want that as we want items to be sorted
        dropSources: ["spLbMemberOf"],
        add: spLbNotMemberOfAdd
    });

    _$spLbMembers.kendoListBox({
        dataSource: [],
        connectWith: "spLbNonMembers",
        toolbar: {
            tools: ["transferTo", "transferFrom"],
            position: "right"
        },
        draggable: true,        // true allows items within the same listbox to be reordered. we don't want that as we want items to be sorted
        dropSources: ["spLbNonMembers"],
        dataTextField: "Name",
        dataValueField: "UId",
        template: "<div class='#: IsEnabled ? \"\" : \"k-state-disabled\" #'><span class='#=SUPLEXUI.getSecurityPrincipalIconClass(IsUser, IsLocal, IsEnabled) #'></span><span>#: Name #</span></div>",
        add: spLbMembersAdd,
        remove: spLbMembersRemove
    });

    _$spLbNonMembers.kendoListBox({
        dataSource: [],
        dataTextField: "Name",
        dataValueField: "UId",
        template: "<div class='#: IsEnabled ? \"\" : \"k-state-disabled\" #'><span class='#=SUPLEXUI.getSecurityPrincipalIconClass(IsUser, IsLocal, IsEnabled) #'></span><span>#: Name #</span></div>",
        draggable: true,        // true allows items within the same listbox to be reordered. we don't want that as we want items to be sorted
        dropSources: ["spLbMembers"],
        add: spLbNonMembersAdd
    });

    _validator = _$spEditor.kendoValidator({
        validateOnBlur: false,
        validate: function (e) {
            $("span.k-invalid-msg").hide();
        }
    }).data("kendoValidator");

    _$spTlGroupHierarchy.kendoTreeList({
        dataSource: {
            data: [],
            schema: {
                model: {
                    id: "MemberUId",
                    parentId: "GroupUId",
                    fields: {
                        MemberUId: { type: "string", nullable: false },
                        GroupUId: { type: "string", nullable: true }
                    }
                }
            }
        },
        columns: [
            { field: "Name" },
            { field: "Description" }
        ],
        selectable: true
    });
}

function setupEventHandlers() {

    // need to test on IE 11    
    $(window).resize(debounce(resizeSplitter, 500)).trigger('resize');

    // click comes after grid change event
    _$spGrd.on('click', 'tbody tr', spGrdClick);

    // security principals filter
    _$spTxtGrdFilter.on("input", function (e) {
        e.preventDefault();
        //var value = $(e.target).val()
        var searchString = $(this).val() as string;
        if (searchString.length > 0) { // there is text
            _k$spGrd.dataSource.filter(
                { field: "Name", operator: "contains", value: searchString });
        }
        else {
            _k$spGrd.dataSource.filter({});
        }

    });
    // member of filter
    _$spTxtMemberOfFilter.on("input", function (e) {
        e.preventDefault();
        var searchString = $(this).val() as string;
        if (searchString.length > 0) {
            _k$spLbMemberOf.dataSource.filter({ field: "Name", operator: "contains", value: searchString });
        }
        else {
            _k$spLbMemberOf.dataSource.filter({});
        }
    });
    // not member of filter
    _$spTxtNotMemberOfFilter.on("input", function (e) {
        e.preventDefault();
        var searchString = $(this).val() as string;
        if (searchString.length > 0) {
            _k$spLbNotMemberOf.dataSource.filter({ field: "Name", operator: "contains", value: searchString });
        }
        else {
            _k$spLbNotMemberOf.dataSource.filter({});
        }
    });
    // members filter
    _$spTxtMembersFilter.on("input", function (e) {
        e.preventDefault();
        var searchString = $(this).val() as string;
        if (searchString.length > 0) {
            _k$spLbMembers.dataSource.filter({ field: "Name", operator: "contains", value: searchString });
        }
        else {
            _k$spLbMembers.dataSource.filter({});
        }
    });
    // non members filter
    _$spTxtNonMembersFilter.on("input", function (e) {
        e.preventDefault();
        var searchString = $(this).val() as string;
        if (searchString.length > 0) {
            _k$spLbNonMembers.dataSource.filter({ field: "Name", operator: "contains", value: searchString });
        }
        else {
            _k$spLbNonMembers.dataSource.filter({});
        }
    });

}

function setupVariables() {
    _k$spGrd = _$spGrd.data('kendoGrid');
    _k$spLbMemberOf = _$spLbMemberOf.data('kendoListBox');
    _k$spLbNotMemberOf = _$spLbNotMemberOf.data('kendoListBox');
    _k$spLbMembers = _$spLbMembers.data('kendoListBox');
    _k$spLbNonMembers = _$spLbNonMembers.data('kendoListBox');
    _k$spTlGroupHierarchy = _$spTlGroupHierarchy.data('kendoTreeList');
}

function resizeSplitter() {

    console.log("In resizeSplitter...");
    var top = 125; // height occupied above splitter
    var bottom = 25; // height occupied below splitter
    var height = $(window).height() - (top + bottom) - 1;
    height = (height <= 0) ? 100 : height;
    _$spSpltr.height(height);

    //_$spSpltr.trigger( "resize" )
    //_$spSpltr.data('kendoSplitter').trigger( "resize" )
    _$spSpltr.data('kendoSplitter').resize();
}
export function resetSecurityPrincipals() {
    spVM.reset();
    resetEditor(false);
    _k$spGrd.dataSource.data([]);
}
export function showSecurityPrincipals() {
    if (!spVM.get("visible"))
        spVM.set("visible", true);
}

export function hideSecurityPrincipals() {
    if (spVM.get("visible"))
        spVM.set("visible", false);
}

export function loadSecurityPrincipals() {
    var ds = _k$spGrd.dataSource;
    ds.read();
}

function spGrdClick(e) {
    console.log("In spGrdClick...");

    // var selectedItem = e.sender.dataItem(this.select())
    // click event is triggered after change event. so by now we would have the selected row
    var selectedItem = _k$spGrd.dataItem(_k$spGrd.select()); // or _k$spGrd.select()[0] ?
    console.log(selectedItem);

    if (!selectedItem) return;

    if ((spVM.get("selectedUId") == selectedItem.UId) && (selectedItem.UId == spVM.editor.model.get("UId"))) {
        return;
    }
    /// changes start here
    verifySaveChanges().then(function (proceed) {
        console.log("-- " + proceed);
        if (proceed) {
            selectSecurityPrincipalGridItem(selectedItem.UId); // verifySaveChanges() could have cleared/changed the selection
            resetEditor(true);
            spVM.set("selectedUId", selectedItem.UId);
            spVM.editor.model.set("IsUser", selectedItem.IsUser); // to ensure the correct view is displayed
            var promise;
            if (selectedItem.IsUser) {
                promise = getUser(selectedItem.UId);
            }
            else {
                promise = getGroup(selectedItem.UId);
            }
            promise
                .done(function (data) {
                    if (data.Status == constants.SUCCESS) {
                        populateEditor(data);
                    }
                    else {
                        notifyError("There is a problem retrieving " + (selectedItem.IsUser ? "user" : "group") + " information");
                    }
                })
                .fail(function (jqXHR, textStatus, errorThrown) {
                    notifyError("There is a problem retrieving " + (selectedItem.IsUser ? "user" : "group") + " information");
                });
        }
        else {
            // restore previous grid selection
            selectSecurityPrincipalGridItem(spVM.get("selectedUId"));
        }
    });
}

export function verifySaveChanges() {

    console.log("In verifySaveChanges...");
    var dfd = $.Deferred();

    if (!spVM.editor.get("hasChanges")) {
        dfd.resolve(true);
    }
    else {
        var isEditingUser = spVM.editor.model.get("IsUser");
        var message = "Save changes to " + (isEditingUser ? "User " : "Group ") + spVM.editor.model.get('Name') + "?";
        $.when(showYesNoCancelDialog("Save changes", message)).then(function (response) {
            console.log("-- Response is " + response);
            switch (response) {

                case 1:  // go ahead and save
                    clearEditorErrors();
                    if (validateEditor()) {
                        var promise;
                        if (isEditingUser) {
                            promise = saveUser();
                        }
                        else {
                            promise = saveGroup();
                        }

                        promise.then(function (data) { return checkResponseStatus(data, _$spEditorError) })       // resolve(data), reject(data)
                            .then(updateUIPostSave)
                            .then(
                                function (data) {       // success callback

                                    // notify user of successful save
                                    if (isEditingUser)
                                        notifySaveUserOK(data);
                                    else
                                        notifySaveGroupOK(data);

                                    dfd.resolve(true);

                                },
                                function (jqXHR, textStatus, errorThrown) {  // failure callback

                                    // notify user of error
                                    if (isEditingUser)
                                        notifySaveUserFailed(jqXHR, textStatus, errorThrown);
                                    else
                                        notifySaveGroupFailed(jqXHR, textStatus, errorThrown);

                                    dfd.resolve(false);

                                })
                            .always(unblockUI);
                    }
                    else {
                        // failed client validation
                        notifyError("Please correct the error(s) on the form first.");
                        dfd.resolve(false);
                    }
                    break;

                case 2: // discard changes and continue
                    dfd.resolve(true);

                    break;

                case 3: // cancel action
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

function populateEditor(data) {
    console.log("In populateEditor...");
    if (data) {
        if (data.Data.User) {
            spVM.editor.set("model", data.Data.User);
            _memberOfOriginal = JSON.parse(JSON.stringify(data.Data.MemberOf)); // clone
            _k$spLbMemberOf.dataSource.data(data.Data.MemberOf);
            _k$spLbNotMemberOf.dataSource.data(data.Data.NotMemberOf);
        }
        else if (data.Data.Group) {
            spVM.editor.set("model", data.Data.Group);
            _membersOriginal = JSON.parse(JSON.stringify(data.Data.Members)); // clone
            _k$spLbMembers.dataSource.data(data.Data.Members);
            _k$spLbNonMembers.dataSource.data(data.Data.NonMembers);
            _k$spTlGroupHierarchy.dataSource.data(data.Data.GroupHierarchy);
        }
    }
}
function resetEditor(showEditor) {
    spVM.editor.reset(showEditor);
    //spVM.editor.set( "visible", showEditor ) 
    _k$spLbMemberOf.dataSource.data([]);
    _k$spLbNotMemberOf.dataSource.data([]);
    _k$spLbMembers.dataSource.data([]);
    _k$spLbNonMembers.dataSource.data([]);
    clearEditorErrors();
    _memberOfOriginal = [];
    _membersOriginal = [];
}

export function getSecurityPrincipalIconClass(IsUser, IsLocal, IsEnabled) {
    var cls = (IsUser) ? "icon-user" : (IsLocal) ? "icon-group" : "icon-group-ext";
    return ("k-sprite " + cls + (IsEnabled ? "" : " k-state-disabled"));
}

export function spBtnSaveClick(e) {
    console.log("In spBtnSaveClick...");
    if (spVM.editor.model.get("IsUser")) {
        clearEditorErrors();
        if (validateEditor()) {
            saveUser()
                .then(function (data) { return checkResponseStatus(data, _$spEditorError) })
                .then(updateUIPostSave)
                .then(notifySaveUserOK, notifySaveUserFailed)
                .always(unblockUI);
        }
    }
    else {
        //do the same for group
        clearEditorErrors();
        if (validateEditor()) {
            saveGroup()
                .then(function (data) { return checkResponseStatus(data, _$spEditorError) })
                .then(updateUIPostSave)
                .then(notifySaveGroupOK, notifySaveGroupFailed)
                .always(unblockUI);
        }
    }
}
function notifySaveUserOK(data) {
    console.log("In notifySaveUserOK...");
    notifySuccess("User " + data.Data.User.Name + " saved successfully.");
    return true;
}
function notifySaveUserFailed(jqXHR, textStatus, errorThrown) {
    console.log("In notifySaveUserFailed...");
    if (jqXHR.Data.User) {
        // reject because of form error
        notifyError(jqXHR.Data.Message);
    }
    else {
        // reject because of ajax call
        let msg = decipherJqXhrError(jqXHR, textStatus);
        notifyError("An error has occurred while saving User." + "<br/>" + "Error: " + msg);
    }

    return false;
}
function notifySaveGroupOK(data) {
    console.log("In notifySaveGroupOK...");
    notifySuccess("Group " + data.Data.Group.Name + " saved successfully.");
    return true;
}
function notifySaveGroupFailed(jqXHR, textStatus, errorThrown) {
    console.log("In notifySaveGroupFailed...");
    if (jqXHR.Data.Group) {
        // reject because of form error
        notifyError(jqXHR.Data.Message);
    }
    else {
        // reject from ajax call 
        let msg = decipherJqXhrError(jqXHR, textStatus);
        notifyError("An error has occurred while saving Group." + "<br/>" + "Error: " + msg);
    }

    return false;
}
function checkResponseStatus(data, $formErrorContainer?) {
    console.log("In checkResponseStatus...");
    if (data.Status != constants.SUCCESS) {
        if (data.ValidationErrors) {
            if ($formErrorContainer) {
                let msg = "";
                $(data.ValidationErrors).each(function () {
                    console.log(this);
                    msg += this + "<br/>";
                });
                if (msg.length > 0) {
                    $formErrorContainer.html(msg);
                }
            }
            setError(true);
        }

        return $.Deferred().reject(data);
    }
    else {
        return $.Deferred().resolve(data);
    }
}

function updateUIPostSave(data) {
    console.log("In updateUIPostSave...");

    mainVM.setChange(true);

    var model = null;
    if (data.Data.User) {
        spVM.set("selectedUId", data.Data.User.UId);
        model = data.Data.User;
    }
    else if (data.Data.Group) {
        spVM.set("selectedUId", data.Data.Group.UId);
        model = data.Data.Group;
    }
    if (model) {
        setChange(false);
        spVM.editor.set("model", model);
        updateSecurityPrincipalsGrid(new _spGridModel({
            UId: model.UId,
            Name: model.Name,
            Description: model.Description,
            IsEnabled: model.IsEnabled,
            IsUser: model.IsUser,
            IsLocal: model.IsLocal,
            Source: model.IsUser ? "User" : (model.IsLocal ? "Suplex" : "External")
        }));
    }

    return $.Deferred().resolve(data);
}
function saveUser() {
    console.log("In saveUser...");
    // JSON.parse(JSON.stringify()) will clone and remove all the unnecessary functions wrapped inside the array by the kendo widget
    // but it looks like it is not necessary. lodash's differenceBy still works
    // var memberOf = JSON.parse( JSON.stringify( _k$spLbMemberOf.dataSource.data() ) )
    var memberOf = _k$spLbMemberOf.dataSource.data();
    var toAdd = differenceBy(memberOf, _memberOfOriginal, 'UId');
    var toRemove = differenceBy(_memberOfOriginal, memberOf, 'UId');
    var def = $.ajax({
        method: 'POST',
        url: getActionUrl("SaveUser", "Admin"),
        contentType: 'application/json',
        data: JSON.stringify({ User: spVM.editor.get("model"), MembersOfToAdd: toAdd, MembersOfToRemove: toRemove }),
        dataType: 'json',
        // TODO: Check beforeSend, which seems not compatible
        // beforeSend: blockUI() 
    });
    return def;
}

function saveGroup() {
    console.log("In saveGroup...");
    var members = _k$spLbMembers.dataSource.data();
    var toAdd = [];
    var toRemove = [];
    if (spVM.editor.model.get("IsLocal")) {
        toAdd = differenceBy(members, _membersOriginal, 'UId');
        toRemove = differenceBy(_membersOriginal, members, 'UId');
    }
    console.log("To add");
    console.log(toAdd);
    console.log("To remove");
    console.log(toRemove);
    var def = $.ajax({
        method: 'POST',
        url: getActionUrl("SaveGroup", "Admin"),
        contentType: 'application/json',
        data: JSON.stringify({ Group: spVM.editor.get("model"), MembersToAdd: toAdd, MembersToRemove: toRemove }),
        dataType: 'json',
        // TODO: Check beforeSend, which seems not compatible
        // beforeSend: blockUI() 
    });
    return def;
}

function validateEditor() {
    console.log("In validateEditor...");
    var ok = _validator.validate();
    if (!ok) {
        var errors = _validator.errors();
        let msg = "";
        $(errors).each(function () {
            msg = this + "<br/>";

        });
        if (msg.length > 0) {
            _$spEditorError.html(msg);
        }
        setError(true);
    }
    return ok;
}

function selectSecurityPrincipalGridItem(uId) {

    if (!uId) return;

    console.log("In selectSecurityPrincipalGridItem...");

    var ds = _k$spGrd.dataSource;

    // explanation from kendo support
    // the grid table row data-uid reflects the uid of the underlying ObservableObject representing the data item
    // in the grid datasoure. The uid is generated on the fly when an object is created.
    // each time the grid datasource is refreshed, the uid values change because the ObservableObjects
    // are re-created with the new data. These uids are not implemented to match the model Id in the datasource

    // if is already selected, don't select again
    var currentSelectedItem = _k$spGrd.dataItem(_k$spGrd.select());
    if (currentSelectedItem)
        if (currentSelectedItem.UId == uId) return;

    var rowuid = ds.get(uId).uid;
    // console.log("-- Locating row uid " + rowuid)
    var foundrow = _k$spGrd.table.find('tr[data-uid="' + rowuid + '"]');
    if (foundrow.length > 0) {
        // console.log("-- Found grid item with UId " + uId)
        _k$spGrd.select(foundrow);
    }
    else {
        _k$spGrd.clearSelection();
        console.log("-- Cannot locate grid item with UId " + uId);
    }
}
function updateSecurityPrincipalsGrid(gridModel) {
    console.log("In updateSecurityPrincipalsGrid...");
    console.log(gridModel);

    var ds = _k$spGrd.dataSource;


    // pushUpdate doesn't seem to work well
    // ds.pushUpdate( gridModel )

    // if using set method, to hide the dirty indicators, follow https://docs.telerik.com/kendo-ui/knowledge-base/disable-dirty-indicator-using-css
    var dataItem = ds.get(gridModel.UId);
    if (typeof dataItem !== "undefined") {
        dataItem.set("Name", gridModel.Name);
        dataItem.set("Description", gridModel.Description);
        dataItem.set("IsEnabled", gridModel.IsEnabled);
        dataItem.set("IsUser", gridModel.IsUser);
        dataItem.set("IsLocal", gridModel.IsLocal);
        dataItem.set("Source", gridModel.Source);
    }
    else {
        // assume new record
        ds.add(gridModel);
        console.log("-- New item added to security principals grid");
    }

    // above action will cause grid selection to clear
    selectSecurityPrincipalGridItem(gridModel.UId);
}
function clearEditorErrors() {
    //_$spEditorError.empty()
    _$spEditorError.empty();
    setError(false);
}

export function spBtnDiscardClick(e) {
    console.log("In spBtnDiscardClick...");

    verifySaveChanges().then(function (proceed) {
        if (proceed) {
            resetEditor(false);
        }
    });
}
export function spBtnNewUserClick(e) {
    console.log("In spBtnNewUserClick...");

    verifySaveChanges().then(function (proceed) {
        //console.log( "-- Verify save changes return value: " + proceed )

        if (proceed) {
            // go ahead and prepare the editor
            resetEditor(true);
            spVM.editor.model.set("IsUser", true); // ensures the user view is displayed
            getNewUser()
                .done(function (data) {
                    if (data.Status == constants.SUCCESS) {
                        populateEditor(data);
                    }
                    else {
                        notifyError("Error retrieving information for new user");
                    }
                })
                .fail(function (jqXHR, textStatus, errorThrown) {
                    var errorMsg = decipherJqXhrError(jqXHR, textStatus);
                    notifyError(errorMsg);
                });
            //.always( function () {
            //    // unselect grid?
            //} )
        }

    });
}

export function spBtnNewGroupClick(e) {
    console.log("In spBtnNewGroupClick...");

    verifySaveChanges().then(function (proceed) {
        //console.log( "-- Verify save changes return value: " + proceed )

        if (proceed) {
            // go on and prepare the editor 
            resetEditor(true);
            spVM.editor.model.set("IsUser", false); // to make sure the correct fields are displayed
            getNewGroup()
                .done(function (data) {
                    if (data.Status == constants.SUCCESS) {
                        populateEditor(data);
                    }
                    else {
                        notifyError("Error retrieving information for new group");
                    }
                })
                .fail(function (jqXHR, textStatus, errorThrown) {
                    var errorMsg = decipherJqXhrError(jqXHR, textStatus);
                    notifyError(errorMsg);
                });
            //.always( function () {
            //    // unselect grid?
            //} )

        }
    });
}
export function spBtnDeleteClick(e) {
    console.log("In spBtnDeleteClick...");

    // get the selected item
    var itemToDelete = _k$spGrd.dataItem(_k$spGrd.select());
    if (!itemToDelete)
        return;

    var message = "Are you sure you want to delete " + (itemToDelete.IsUser ? "User " : "Group ") + itemToDelete.Name + "?";

    var action = itemToDelete.IsUser ? "DeleteUser" : "DeleteGroup";
    $.when(showYesNoDialog("Confirm Delete", message))
        .then(function (response) {
            if (response == 1) {  // ok
                blockUI();
                $.post(getActionUrl(action, "Admin"), { 'uId': itemToDelete.UId })
                    .then(function (data) { return checkResponseStatus(data) })   // resolve(data), reject(data)
                    .then(function () { return updateUIPostDelete(itemToDelete) }) //  doesn't reject, always returns true
                    .then(
                        function () {       // success callback
                            notifySuccess(itemToDelete.IsUser ? "User " : "Group " + itemToDelete.Name + " deleted successfully.");
                        },
                        function (jqXHR: JQueryXHR, textStatus: string, errorThrown) {       // failure callback
                            let msg = decipherJqXhrError(jqXHR, textStatus);
                            notifyError("An error has occurred while deleting " + (itemToDelete.IsUser ? "User" : "Group") + itemToDelete.Name + ".<br/>" + "Error: " + msg);
                        }
                    )
                    .always(unblockUI);
            }
        });
}

function updateUIPostDelete(gridDataItem) {

    // remove item from grid
    var ds = _k$spGrd.dataSource;
    ds.remove(gridDataItem);
    spVM.set("selectedUId", null);

    // reset editor & hide it
    resetEditor(false);

    mainVM.setChange(true);

    return true;

}

function getUser(uId) {
    return $.ajax({
        method: 'GET',
        url: getActionUrl("GetUserByUId", "Admin"),
        data: { 'uId': uId },
        dataType: 'json'
    });
}
function getNewUser() {
    return $.ajax({
        method: 'GET',
        url: getActionUrl("GetNewUser", "Admin"),
        dataType: 'json'
    });
}
function getGroup(uId) {
    console.log("In getGroup...");

    return $.ajax({
        method: 'GET',
        url: getActionUrl("GetGroupByUId", "Admin"),
        data: { 'uId': uId },
        dataType: 'json'
    });
}
function getNewGroup() {
    return $.ajax({
        method: 'GET',
        url: getActionUrl("GetNewGroup", "Admin"),
        dataType: 'json'
    });
}

export function spLbMemberOfAdd(e) {
    //help on how to auto sort
    //https://github.com/telerik/kendo-ui-core/blob/master/docs/knowledge-base/listbox-sort-items-on-add.md
    console.log("In spLbMemberOfAdd...");
    e.preventDefault();
    this.dataSource.data().push(e.dataItems[0]);
    this.dataSource.sort({ field: "Name", dir: "asc" });
    setChange(true);
}
export function spLbMemberOfRemove(e) {
    setChange(true);
}

function spLbNotMemberOfAdd(e) {
    console.log("In spLbNotMemberOfAdd...");
    e.preventDefault();
    this.dataSource.data().push(e.dataItems[0]);
    this.dataSource.sort({ field: "Name", dir: "asc" });
}

function spLbMembersAdd(e) {
    //help on how to auto sort
    //https://github.com/telerik/kendo-ui-core/blob/master/docs/knowledge-base/listbox-sort-items-on-add.md
    console.log("In spLbMembersAdd...");
    e.preventDefault();
    this.dataSource.data().push(e.dataItems[0]);
    this.dataSource.sort({ field: "Name", dir: "asc" });
    setChange(true);
}

function spLbMembersRemove(e) {
    setChange(true);
}

function spLbNonMembersAdd(e) {
    console.log("In spLbNonMembersAdd...");
    e.preventDefault();
    this.dataSource.data().push(e.dataItems[0]);
    this.dataSource.sort({ field: "Name", dir: "asc" });
}

