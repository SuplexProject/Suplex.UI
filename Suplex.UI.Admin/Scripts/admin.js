var SUPLEXUI = SUPLEXUI || {};

SUPLEXUI.admin = (function () {
    var $btnOpenSuplexFileStore = $("#btnOpenSuplexFileStore");
    var $dlgFileExplorer;
    var $tvFileExplorer;
    var $grdSecurityPrincipals = $("#grdSecurityPrincipals");

    var vm = kendo.observable({
        isConnected: false,
        hasChanges: false,
        fileName: "",
        showSecureObjects: false,
        showUsersGroups: function () {
            return !this.get("showSecureObjects")
        },
        selectedUsersGroups: {
            uid: "",
            source:""
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
            this.set("usersGroupsItemSelected", false)
            this.selectedUsersGroups.set("uid", "")
            this.selectedUsersGroups.set("source", "")
        }
    });

    var storeEventWatch = new kendo.observable();    
    storeEventWatch.bind("storeSelected", function (e) {
        loadFile(e.fileName)
    })
    storeEventWatch.bind("storeLoaded", function (e) {
        vm.startOver()
        vm.set("isConnected", true)
        vm.set("fileName", e.fileName)
        grdSecurityPrincipalsRefresh()
    })
    storeEventWatch.bind("storeNew", function (e) {
        vm.startOver()
        //$grdSecurityPrincipals.data('kendoGrid').datasource.data([])
        grdSecurityPrincipalsRefresh()
        // clear datasource
        // dsUsersGroups.data([])
        // dsSecureObjects.data([])
    })
    
    var init = function () {        
        createFileExplorerDialog()
        kendo.bind(document.body, vm)        
    };

    var switchView = function (e) {
        vm.set("showSecureObjects", e.id == "secureobjects")
    };

    var getActionUrl = function (action, controller) {
        return $("base").attr("href") + controller + "/" + action;
    }

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

    var createFileExplorerDialog = function () {
        //there is a filter function in this page. doesnt work that well but can copy the concept
        //https://demos.telerik.com/kendo-ui/dialog/treeview-integration
        $dlgFileExplorer = $("#dlgFileExplorer").kendoDialog({
            width: "400px",
            visible: false,
            title: "File explorer",
            closable: true,
            modal: false,
            content: "<div id='tvFileExplorer'></div>",
            open: function () { dsFileExplorer.read()},
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

    var dlgFileExplorerActionOK = function (e) {
        var ok = false
        var selected = $tvFileExplorer.data('kendoTreeView').select()
        var item = $tvFileExplorer.data('kendoTreeView').dataItem(selected)
        if (item) {
            if (item.Type != "File") {
                kendo.alert("Select a file")                
            }
            else {
                storeEventWatch.trigger("storeSelected", { fileName: item.Path })
                ok = true
            }
        }
        else {
            kendo.alert("Select a file")            
        }
        return ok
    }

    var loadFile = function (fileName)
    {
        var ok = false;
        $.ajax({
            async: false,
            method: 'GET',
            url: getActionUrl("LoadFile", "Admin"),
            data: { 'fileName': fileName },
            dataType: 'json'
        }).done(function (data, textStatus, xhr) {            
            if (data.Status == "success")
                ok = true
            else
                showNotification(data.ResponseText, "error");
        }).fail(function (xhr, textStatus, errorThrown) {
            ok = false
            showNotification("There was a problem reading the file", "error")

        })
        if (ok) {            
            storeEventWatch.trigger("storeLoaded", { fileName: fileName } )
        }
        return ok
    }
    var grdSecurityPrincipalsChange = function (e) {
        console.log("Security principal selection change")
        console.log(e)
        var selectedItem = e.sender.dataItem(this.select())
        console.log(selectedItem.Uid)
        console.log(selectedItem.IsUser)
        if (selectedItem.IsUser) {
            console.log("Call GetUserByUid")
            // call GetUserByUid and set usersGroupsItemSelected to true if successful
            vm.set("usersGroupsItemSelected", true)
        }
        else {
            console.log("Call GetGroupByUid")
            // call GetGroupByUid and set usersGroupsItemSelected to true if successful
            vm.set("usersGroupsItemSelected", true)
        }
    };
    var grdSecurityPrincipalsRefresh = function () {
        $grdSecurityPrincipals.data('kendoGrid').dataSource.data([])
        $grdSecurityPrincipals.data('kendoGrid').dataSource.read()
    }
    var newFile = function (e) {
        var ok = verifySaveChangesToStore()
        if (ok) {
            $.ajax({
                async: false,
                method: 'POST',
                url: getActionUrl("NewFile", "Admin"),                
                dataType: 'json'
            }).done(function (data, textStatus, xhr) {
                if (data.Status != "success") {
                    showNotification("Unable to initialize suplex store", "error")
                    ok = false
                }
                else {
                    ok = true
                }
            }).fail(function (xhr, textStatus, errorThrown) {
                showNotification("Unable to initialize suplex store", "error")
                console.log(xhr)
                ok = false
            })
            if (ok) {
                storeEventWatch.trigger("storeNew")
            }            
        }
    }
    var openFile = function (e) {
        var ok = verifySaveChangesToStore();
        if (ok) {            
            $dlgFileExplorer.data('kendoDialog').open()            
        }
    }

    var verifySaveChangesToStore = function () {
        var ok = false
        if (vm.hasChanges) {
            kendo.confirm("Save changes to " + vm.get("fileName"))
            console.log("shd prompt for save")
            // prompt to save. if no save, set ok to true, if save ajax call to save, save and set to ok to true only if success
            // set vm.HasChanges to false
        }
        else
            ok = true
        return ok
    }

    var showNotification = function (msg, msgType, allowHideAfter, autoHideAfter) {
        if (allowHideAfter === undefined) allowHideAfter = 10000
        if (autoHideAfter === undefined) autoHideAfter = 15000
        if (msg == null)
            return;
        const id = "#noti"
        var noti = $(id).data("kendoNotification");
        if (noti) {
            noti.destroy()
            $(id).empty()
        }
        noti = $(id).kendoNotification({
            stacking: "up",
            position: { bottom: 12, left: 12 },
            button: true,
            allowHideAfter: allowHideAfter,
            autoHideAfter: autoHideAfter,
            hideOnClick: false
        }).data("kendoNotification")
        noti.show(msg, msgType)
    }

    var dataSourceError = function (e) {
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

    return {
        init: init,
        switchView: switchView,
        grdSecurityPrincipalsChange: grdSecurityPrincipalsChange,
        openFile: openFile,
        newFile: newFile,
        dlgFileExplorerActionOK: dlgFileExplorerActionOK,
        showNotification: showNotification
    }
})();


