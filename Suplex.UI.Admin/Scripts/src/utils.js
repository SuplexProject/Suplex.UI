
export function showNotification (msg, msgType, allowHideAfter, autoHideAfter) {
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

export function getActionUrl (action, controller) {
    return $("base").attr("href") + controller + "/" + action
}

export function dataSourceError(e) {
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

export function decipherJqXhrError (jqXHR, textStatus) {
    var errorMessage = ""

    if (jqXHR.status === 0) {
        errorMessage = "Not connected. Please verify network connection."
    } else if (jqXHR.status == 404) {
        errorMessage = "Requested page is not found."
    } else if (jqXHR.status == 500) {
        errorMessage = "Internal Server Error."
    } else if (textStatus === "parsererror") {
        errorMessage = "Requested JSON parse failed."
    } else if (textStatus === "timeout") {
        errorMessage = "Timeout error."
    } else if (textStatus === "abort") {
        errorMessage = "Ajax request aborted."
    } else {
        errorMessage = "Uncaught Error. " + jqXHR.responseText
    }
    return errorMessage
}

export function showYesNoCancelDialog( title, content ) {
    var dfd = $.Deferred()
    var result = 0

    $( "<div id='dlgYesNoCancel'></div>" ).appendTo( "body" ).kendoDialog( {
            minWidth: 400,
            minHeight: 150,
            title: title,
            closable: false,
            modal: true,
            content: content,
            visible: false,
            actions: [
                {
                    text: "Yes",
                    action: function () {
                        result =  1
                    }
                },
                {
                    text: "No",
                    action: function () {
                        result = 2 
                    }
                },
                {
                    text: "Cancel",
                    primary: true,
                    action: function () {
                        result = 3 
                    }
                }
            ],
            close: function( e ) {
                this.destroy();
                dfd.resolve( result );
            }

        } ).data( "kendoDialog" ).open()

    return dfd.promise()

}
export function showYesNoDialog( title, content ) {
    var dfd = $.Deferred()
    var result = 0

    $( "<div id='dlgYesNo'></div>" ).appendTo( "body" ).kendoDialog( {
        minWidth: 400,
        minHeight: 150,
        title: title,
        closable: false,
        modal: true,
        content: content,
        visible: false,
        actions: [
            {
                text: "Yes",
                action: function () {
                    result = 1
                }
            },
            {
                text: "No",
                action: function () {
                    result = 2
                }
            }
        ],
        close: function ( e ) {
            this.destroy();
            dfd.resolve( result );
        }

    } ).data( "kendoDialog" ).open()

    return dfd.promise()

}
export function blockUI() {
    kendo.ui.progress( $( document.body ), true );
}

export function unblockUI() {
    kendo.ui.progress( $( document.body ), false );
}
