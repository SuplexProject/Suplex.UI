import { showNotification, getActionUrl } from "./utils"

var $btnOpenFile = $("#btnOpenFile")
var $dlgFileExplorer = $("#dlgFileExplorer")
var $grdSecurityPrincipals = $("#grdSecurityPrincipals")
var $userFormContainer = $("#userFormContainer")
// these JQuery objects can only be initialized as the DOM elements are dynamically created
var $tvFileExplorer 
var $userForm
var $lbGroupMembership
var $lbNonGroupMembership

var storeEventWatch = new kendo.observable()

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
            hasChildren: function (node) {
                if (node.Type == "File")
                    node.spriteCssClass = "file"
                else
                    node.spriteCssClass = "folder"
                return node.HasChildren

            }
        }
    }
})

//storeEventWatch.bind("storeSelected", function (e) {
//    openFile(e.fileName)
//})

// triggered after store data is read and loaded to memory
storeEventWatch.bind("storeOpened", function (e) {
    vm.startOver()
    vm.set("isConnected", true)
    vm.set("fileName", e.fileName)
    grdSecurityPrincipalsRefresh()
})
// triggered after store in memory is initialized
storeEventWatch.bind("storeNew", function (e) {
    vm.startOver()
    //$grdSecurityPrincipals.data('kendoGrid').datasource.data([])
    grdSecurityPrincipalsRefresh()
    // clear datasource
    // dsUsersGroups.data([])
    // dsSecureObjects.data([])
})
// not sure whether want to use or not
storeEventWatch.bind("storeChanged", function (e) {
    vm.set("hasChanges", true)
})

var vm = kendo.observable({
    isConnected: false,
    hasChanges: false,
    fileName: "",
    showSecureObjects: false,
    showUsersGroups: function () {
        return !this.get("showSecureObjects")
    },
    selectedSecurityPrincipal: {
        gUId: "", // cant use uid as it is reserved
        name: "",
        description: "",
        source: "",
        isEnabled: true
    },    
    securityPrincipalSelected: function () {
        return (this.get("selectedSecurityPrincipal.gUId") != "")
    },
    userFormVisible: function () {
        return this.securityPrincipalSelected() && this.get("selectedSecurityPrincipal.source") == "User"
    },
    suplexFormVisible: function () {
        return this.securityPrincipalSelected() && this.get("selectedSecurityPrincipal.source") == "Suplex"
    },
    externalFormVisible: function () {
        return this.securityPrincipalSelected() && this.get("selectedSecurityPrincipal.source") == "External"
    },
    save: function () {
        //https://demos.telerik.com/kendo-ui/mvvm/remote-binding
        //this.productsSource.sync();
        this.set("hasChanges", false)
    },
    // use for individual record remove
    remove: function () {
        if (confirm("Are you sure you want to delete?")) {
            //this.productsSource.remove(this.selectedProduct)
            //this.set("selectedProduct", this.productsSource.view()[0])
            this.change()
        }
    },
    change: function () {
        this.set("hasChanges", true)
    },
    startOver: function () {
        this.set("isConnected", false)
        this.set("hasChanges", false)
        this.set("fileName", "")
        this.set("showSecureObjects", false)        
        this.selectedSecurityPrincipal.set("gUId", "")
        this.selectedSecurityPrincipal.set("name", "")
        this.selectedSecurityPrincipal.set("description", "")
        this.selectedSecurityPrincipal.set("source", "")
        this.selectedSecurityPrincipal.set("isEnabled", true)
    }
})

var userFormVM = new kendo.observable({
    visible: false,
    userModel: null,
    groupMembershipModel: null,
    dirty: false,
    setUserModel: function (model) {
        this.set("userModel", model)
    },
    setGroupMembershipModel: function (model) {
        this.set("groupMembershipModel", model)
    },
    init: function () {
        this.set("visible", false)
        this.set("userModel", null)
        this.set("groupMembershipModel", null)
        this.set("dirty", false)
    }
})

function init() {
    // create widgets
    dlgFileExplorerCreate()
    kendo.bind(document.body, vm)

    // setup user form
    $userFormContainer.html($("#userFormContent").html())
    $userForm = $("#userForm")
    lbGroupMembershipCreate()
    lbNonGroupMembershipCreate()
    kendo.bind($userForm, userFormVM)

    var userFormValidator = $("#userForm").kendoValidator({
        rules: {
            uniquename: function (input) {
                var v = input.data('uniquename')
                // if the input has a `data-uniquename` attribute...
                if (typeof v != 'undefined' && v != false) {
                    var url = input.data('uniquename')
                }
            }
        }
    }).data("kendoValidator")

    $("#btnSaveUser").on('click', function (e) {

        console.log($("#userForm").serialize())
        if (userFormValidator.validate()) {
            alert("OK")
        }
        else
            alert("OH OH")
    })
}

function lbGroupMembershipCreate() {
    
    $lbGroupMembership = $("#lbGroupMembership").kendoListBox({
        dataSource: {
            transport: {
                read: {
                    url: getActionUrl("GetGroupMembershipByUId", "Admin"),
                    data: lbGroupMembershipData,
                    dataType: "json"                    
                }
            },
            schema: {
                data: "Data" //"GroupMembership"
            }

        },
        autoBind: false,
        connectWith: "lbNonGroupMembership",
        draggable: false,
        toolbar: {
            tools: ["transferTo", "transferFrom"],
            position: "right"            
        },        
        selectable: "single",
        dataTextField: "Name",
        dataValueField: "Uid",
        add: lbGroupMembershipAdd,
        remove: lbGroupMembershipRemove,
        drop: lbGroupMembershipDrop
    });
}

function lbGroupMembershipData() {
    return { uId: vm.selectedSecurityPrincipal.get("gUId") }
}

function lbGroupMembershipAdd(e) {
    console.log("Group membership added " + e)
}

function lbGroupMembershipRemove(e) {

}
function lbGroupMembershipDrop(e) {
    console.log(e)
}
function lbNonGroupMembershipCreate() {

    $lbNonGroupMembership = $("#lbNonGroupMembership").kendoListBox({
        dataSource: {
            transport: {
                read: {
                    url: getActionUrl("GetNonGroupMembershipByUId", "Admin"),
                    data: lbNonGroupMembershipData,
                    dataType: "json"
                }
            },
            schema: {
                data: "Data" // "NonGroupMembership"
            }
        },
        autoBind: false,
        connectWith: "lbGroupMembership",
        draggable: false,        
        selectable: "single",
        dataTextField: "Name",
        dataValueField: "Uid"
        //template: "<div>#:name#</div>"
    });
}
function lbNonGroupMembershipData () {
    return { uId: vm.selectedSecurityPrincipal.get("gUId") }
}
function switchView(e) {
    vm.set("showSecureObjects", e.id == "btnSecureObjectsShow")
}

function dlgFileExplorerCreate () {
    //there is a filter function in this page. doesnt work that well but can copy the concept
    //https://demos.telerik.com/kendo-ui/dialog/treeview-integration
    $dlgFileExplorer.kendoDialog({
        width: "400px",
        visible: false,
        title: "File explorer",
        closable: true,
        modal: false,
        content: "<div id='tvFileExplorer'></div>",
        open: function () {
            if (dsFileExplorer.data().length == 0)
                dsFileExplorer.read()
        },
        actions: [
            { text: 'Cancel' },
            { text: 'OK', primary: true, action: dlgFileExplorerActionOK }
        ]
    })
    $tvFileExplorer = $("#tvFileExplorer").kendoTreeView({
        autoBind: false,
        dataSource: dsFileExplorer,
        dataTextField: "Name"
    })
}
function dlgFileExplorerActionOK (e) {
    var ok = false
    var selected = $tvFileExplorer.data('kendoTreeView').select()
    var item = $tvFileExplorer.data('kendoTreeView').dataItem(selected)
    if (item) {
        if (item.Type != "File") {
            kendo.alert("Select a file")
        }
        else {
            //storeEventWatch.trigger("storeSelected", { fileName: item.Path })
            openFile(item.Path)
            ok = true
        }
    }
    else {
        kendo.alert("Select a file")
    }
    return ok
}

function openFile (fileName) {
    $.ajax({
        async: false,
        method: 'GET',
        url: getActionUrl("OpenFile", "Admin"),
        data: { 'fileName': fileName },
        dataType: 'json'
    }).done(function (data, textStatus, xhr) {
        if (data.Status == "success") {
            storeEventWatch.trigger("storeOpened", { fileName: fileName })
        }
        else {
            showNotification(data.Message, "error");
        }
    }).fail(function (xhr, textStatus, errorThrown) {
        ok = false
        showNotification("There was a problem reading the file", "error")
    })
}
function grdSecurityPrincipalsChange(e) {
    console.log("Security principal selection change")
    console.log(e)
    var selectedItem = e.sender.dataItem(this.select())
    console.log("Security principal selected " + selectedItem.UId)
    if (vm.get("selectedSecurityPrincipal.gUId") != selectedItem.UId) {
        if (verifySaveUserChanges()) {
            vm.set("selectedSecurityPrincipal.gUId", selectedItem.UId)
            vm.set("selectedSecurityPrincipal.name", selectedItem.Name)
            vm.set("selectedSecurityPrincipal.source", selectedItem.Source)
            if (selectedItem.Source == "User") {
                var userDef = getUserByUId(selectedItem.UId)
                userDef.done(function (userData) {
                    if (userData.Status == "success") {
                        vm.selectedSecurityPrincipal.set("isEnabled", userData.Data.IsEnabled)                        
                        userFormVM.setUserModel(userData.Data)
                        $lbGroupMembership.data("kendoListBox").dataSource.read()
                        $lbNonGroupMembership.data("kendoListBox").dataSource.read()
                        userFormVM.setGroupMembershipModel($lbGroupMembership.data("kendoListBox").dataSource.data())
                    }
                })
            }
            else {
                console.log("Call GetGroupByUId")
            }            
        }
    }
}
function grdSecurityPrincipalsRefresh() {
    $grdSecurityPrincipals.data('kendoGrid').dataSource.data([])
    $grdSecurityPrincipals.data('kendoGrid').dataSource.read()
}

function verifySaveUserChanges() {
    return true
}

//function selectedSecurityPrincipalUId () {    
//    return {
//            uId: vm.get("selectedSecurityPrincipal.UId")
//        }
//}


//function GetGroupMembershipByUId(uId) {
//    return $.ajax({
//        async: false,
//        method: 'GET',
//        url: getActionUrl("GetGroupMembershipByUId", "Admin"),
//        data: { 'uId': uId },
//        dataType: 'json'
//    })
//}
//function GetNonGroupMembershipByUId(uId) {
//    return $.ajax({
//        async: false,
//        method: 'GET',
//        url: getActionUrl("GetNonGroupMembershipByUId", "Admin"),
//        data: { 'uId': uId },
//        dataType: 'json'
//    })
//}
function btnNewFileClick (e) {
    if (verifySaveChangesToStore()) {
        $.ajax({
            async: false,
            method: 'POST',
            url: getActionUrl("NewFile", "Admin"),
            dataType: 'json'
        }).done(function (data, textStatus, xhr) {
            if (data.Status != "success") {
                showNotification("Unable to initialize suplex store", "error")                
            }
            else {
                storeEventWatch.trigger("storeNew")
            }
        }).fail(function (xhr, textStatus, errorThrown) {
            showNotification("Unable to initialize suplex store", "error")
            console.log(xhr)            
        })
    }
}
function btnOpenFileClick (e) {
    if (verifySaveChangesToStore()) {        
        $dlgFileExplorer.data('kendoDialog').open()
    }
}

function verifySaveChangesToStore () {
    var ok = false
    if (vm.get("hasChanges")) {
        kendo.confirm("Save changes to " + vm.get("fileName"))
        console.log("shd prompt for save")
        // prompt to save. if no save, set ok to true, if save ajax call to save, save and set to ok to true only if success
        // set vm.HasChanges to false
    }
    else
        ok = true
    return ok
}

function dataSourceError (e) {
    this.data([]);  // "this" is set to the data source instance
    //console.log(e);
    // e.status can be null, "timeout", "error", "abort", and "parsererror"
    // e.errorThrown is the textual portion of the HTTP status
    if (e) {
        var msg = decipherJqXhrError(e.xhr, e.status);
        if (e.errors) {
            $.each(e.errors, function (key, value) {
                if ('errors' in value) {
                    $.each(value.errors, function () {
                        msg += this + "\n";
                    });
                }
            });
        }
        //noti.error("Request failed. " + "\n" + msg);
        showNotification(msg, "error");
    }
}    

// user related functions
function getUserByUId(uId) {
    return $.ajax({
        async: false,
        method: 'GET',
        url: getActionUrl("GetUserByUId", "Admin"),
        data: { 'uId': uId },
        dataType: 'json'
    })
}

function upsertUser() {
    // create and populate model object
    var userModel =
        {
            "UId" : $("#Uid").text,
            "Name": $("#Title").val(),
            "Description": titleText,
            "IsEnabled": true,
            "GroupMemberShip":  [] // list of Group Uids
        }

    var jsonToPost = JSON.stringify(userModel)

    // in the action method UpsertUser(UserVM model)
    //https://haacked.com/archive/2010/04/15/sending-json-to-an-asp-net-mvc-action-method-argument.aspx/
//    [HttpPost]
//public ActionResult Save(PersonInputModel inputModel) {
//        if (ModelState.IsValid) {
//            string message = string.Format("Created user '{0}' aged '{1}' in the system."
//                , inputModel.Name, inputModel.Age);
//            return Json(new PersonViewModel { Message = message });
//        }
//        else {
//            string errorMessage = "<div class=\"validation-summary-errors\">"
//                + "The following errors occurred:<ul>";
//            foreach(var key in ModelState.Keys) {
//                var error = ModelState[key].Errors.FirstOrDefault();
//                if (error != null) {
//                    errorMessage += "<li class=\"field-validation-error\">"
//                        + error.ErrorMessage + "</li>";
//                }
//            }
//            errorMessage += "</ul>";
//            return Json(new PersonViewModel { Message = errorMessage });
//        }
//    }
    $.ajax({
        url: '/admin/UpdateUser/',
        async: true,
        processData: false,
        data: jsonToPost,
        type: 'POST',
        contentType: 'application/json; charset=utf-8',
        success: function (data) {
            // on success
            // refresh securityprincipals grid
        },
        error: function (xhr, param) {
            console.log(xhr);
            console.log(param);
        }
    })
}


$(document).ready(function () {
    init();
})

export { btnOpenFileClick, btnNewFileClick, switchView, grdSecurityPrincipalsChange, dataSourceError }