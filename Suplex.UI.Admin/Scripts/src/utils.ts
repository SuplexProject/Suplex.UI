export function notifyError(msg: string, allowHideAfter?: number, autoHideAfter?: number) : void {
    showNotification(msg, "error", allowHideAfter, autoHideAfter);
}
export function notifyInfo(msg: string, allowHideAfter?: number, autoHideAfter?: number) : void {
    showNotification(msg, "info", allowHideAfter, autoHideAfter);
}
export function notifySuccess(msg: string, allowHideAfter?: number, autoHideAfter?: number) : void {
    showNotification(msg, "success", allowHideAfter, autoHideAfter);
}
export function notifyWarning(msg: string, allowHideAfter?: number, autoHideAfter?: number) : void {
    showNotification(msg, "warning", allowHideAfter, autoHideAfter);
}
export function showNotification(msg: string, msgType: string, allowHideAfter: number, autoHideAfter: number) : void {
    if (allowHideAfter === undefined) allowHideAfter = 5000;
    if (autoHideAfter === undefined) autoHideAfter = 15000;
    if (msg == null) return;
    const id = "#noti";
    let noti = $(id).data("kendoNotification");
    if (noti) {
        noti.destroy();
        $(id).empty();
    }
    noti = $(id)
        .kendoNotification({
            stacking: "up",
            position: { bottom: 12, left: 12 },
            button: true,
            allowHideAfter: allowHideAfter,
            autoHideAfter: autoHideAfter,
            hideOnClick: false,
        })
        .data("kendoNotification");
    noti.show(msg, msgType);
}

export function getActionUrl(action: string, controller: string) : string {
    return $("base").attr("href") + controller + "/" + action;
}

export function dataSourceError(e: any) : void {
    this.data([]); // "this" is set to the data source instance
    //console.log(e);
    // e.status can be null, "timeout", "error", "abort", and "parsererror"
    // e.errorThrown is the textual portion of the HTTP statuses
    if (e) {
        let msg = decipherJqXhrError(e.xhr, e.status);
        if (e.errors) {
            $.each(e.errors, function(key, value) {
                console.log(key); // TODO: Key is not used
                if ("errors" in value) {
                    $.each(value.errors, function() {
                        msg += this + "\n";
                    });
                }
            });
        }
        //noti.error("Request failed. " + "\n" + msg);
        notifyError(msg);
    }
}

export function decipherJqXhrError(jqXHR: JQueryXHR, textStatus: string) : string {
    let errorMessage = "";

    if (jqXHR.status === 0) {
        errorMessage = "Not connected. Please verify network connection.";
    } else if (jqXHR.status == 404) {
        errorMessage = "Requested page is not found.";
    } else if (jqXHR.status == 500) {
        errorMessage = "Internal Server Error.";
    } else if (textStatus === "parsererror") {
        errorMessage = "Requested JSON parse failed.";
    } else if (textStatus === "timeout") {
        errorMessage = "Timeout error.";
    } else if (textStatus === "abort") {
        errorMessage = "Ajax request aborted.";
    } else {
        errorMessage = "Uncaught Error. " + jqXHR.responseText;
    }
    return errorMessage;
}

export enum DialogResponse {
    None,
    Yes,
    No,
    Cancel
}
export function showYesNoCancelDialog( title: string, content: string ): JQueryPromise<DialogResponse> {
    let dfd = $.Deferred<DialogResponse>();
    let result = DialogResponse.None;

    $("<div id='dlgYesNoCancel'></div>")
        .appendTo("body")
        .kendoDialog({
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
                    action: function() {
                        result = DialogResponse.Yes;
                    },
                },
                {
                    text: "No",
                    action: function() {
                        result = DialogResponse.No;
                    },
                },
                {
                    text: "Cancel",
                    primary: true,
                    action: function() {
                        result = DialogResponse.Cancel;
                    },
                },
            ],
            close: function() {
                this.destroy();
                dfd.resolve(result);
            },
        })
        .data("kendoDialog")
        .open();

    return dfd.promise();
}

export function showYesNoDialog( title: string, content: string ): JQueryPromise<DialogResponse> {
    let dfd = $.Deferred<DialogResponse>();
    let result = DialogResponse.None;

    $("<div id='dlgYesNo'></div>")
        .appendTo("body")
        .kendoDialog({
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
                    action: function() {
                        result = DialogResponse.Yes;
                    },
                },
                {
                    text: "No",
                    action: function() {
                        result = DialogResponse.No;
                    },
                },
            ],
            close: function() {
                this.destroy();
                dfd.resolve(result);
            },
        })
        .data("kendoDialog")
        .open();

    return dfd.promise();
}
export function showAlert(title: string, content: string) {
    // https://docs.telerik.com/kendo-ui/controls/layout/dialog/how-to/customize-predefined-dialogs
    // TODO: Alert option here is not matching the typing. Kendo.Dialog should be used instead.
    // Workaround to coerce DialogOptions as AlertOptions.
    $("<div></div>")
        .kendoAlert({
            title: title,
            minWidth: 400,
            minHeight: 150,
            content: content,
        } as kendo.ui.AlertOptions)
        .data("kendoAlert")
        .open();
}
export function blockUI() {
    kendo.ui.progress($(document.body), true);
}

export function unblockUI() {
    kendo.ui.progress($(document.body), false);
}

export function isValidFileName(fileName: string) : boolean {
    return !fileName ? false : true;
}
export function isPowerOfTwo(x: number) : boolean {
    return (x & (x - 1)) == 0 ? true : false;
}

export interface AjaxResponse {
    Status: AjaxResponseStatus;
    Message: string;
    ValidationErrors: string[],
    Data: any
}
export enum AjaxResponseStatus {
    None = "",
    Success = "success",
    Error = "error"
}
