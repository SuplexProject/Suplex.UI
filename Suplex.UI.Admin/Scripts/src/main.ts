import * as ID from "./ids";
//import * as constants from "./constants";
import { spSetup, spShow, spHide, spReset, spLoad, spVerifySaveChanges } from "./sp";

import { soSetup, soHide, soShow, soReset, soLoad, soVerifySaveChanges } from "./so";
import { getActionUrl, AjaxResponseStatus, notifyError, decipherJqXhrError, AjaxResponse } from "./utils";

let $tbMain = $( ID.TB_MAIN );
let k$tbMain: kendo.ui.ToolBar = null;
let $tbbShowSecureObjects: JQuery = null;
let $tbbShowSecurityPrincipals: JQuery = null;

function init() {
   
    setupWidgets();
    setupVariables();
    setupEventHandlers();

    spSetup();
    soSetup();

    // turn off autocomplete & autocorrect
    $("input").attr("autocomplete", "off");
    $("input").attr("autocorrect", "off");

    // if no connection, hide both views, disable both buttons 
    isConnected()
        .then( () => {
            k$tbMain.enable( $tbbShowSecureObjects, true );
            k$tbMain.enable( $tbbShowSecurityPrincipals, true );
            spLoad();
            soLoad();
            // default to this view
            $( ID.TBB_SHOW_SECURE_OBJECTS ).click();
        } )
        .fail( () => {
            // hide both views, disable buttons
            k$tbMain.enable( $tbbShowSecureObjects, false );
            k$tbMain.enable( $tbbShowSecurityPrincipals, false );
            soHide();
            spHide();
        })
}

function isConnected(): JQueryPromise<void> {
    let dfd = $.Deferred();
    $.ajax( getActionUrl( "IsConnected", "Admin" ) )
        .then( ( data: AjaxResponse ) => {
            if ( data.Status == AjaxResponseStatus.Success ) {
                dfd.resolve();
            }
            else {
                notifyError( "Not able to connect to the remote service" );
                dfd.reject()
            }
        } )
        .fail( ( jqXHR, textStatus, errorThrown ) => {
            let msg = decipherJqXhrError( jqXHR, textStatus );
            notifyError( `Not able to connect to the remote service.<br/>${msg}` );
            dfd.reject();
        } )
    return dfd.promise();
}
function setupWidgets() {
}

function setupVariables() {    
    k$tbMain = $tbMain.data( "kendoToolBar" );
    $tbbShowSecureObjects = $( ID.TBB_SHOW_SECURE_OBJECTS );
    $tbbShowSecurityPrincipals = $( ID.TBB_SHOW_SECURITY_PRINCIPALS );

}

function setupEventHandlers() {
    $(".js-accordion .k-link").click(function() {
        $( this )
            .closest( '.js-accordion' )
            .next()
            .toggle();
        //$( this ).find( "span:first-child" ).toggleClass( "k-i-arrow-chevron-up k-i-arrow-chevron-down" )
        $(this)
            .find("span.k-i-arrow-chevron-up, span.k-i-arrow-chevron-down")
            .toggleClass("k-i-arrow-chevron-up k-i-arrow-chevron-down");
    });
}

function tbbRemoteRefreshClick() {
    console.log( "In tbbRemoteRefreshClick..." );
    spVerifySaveChanges()
        .then( ( proceed: boolean ) => {
            if ( proceed ) {
                return soVerifySaveChanges();
            }
            else {
                return false;
            }
        } )
        .then( ( proceed: boolean ) => {
            if ( proceed ) {
                // test if there is a connection first
                isConnected()
                    .then( () => {
                        spReset();
                        soReset();
                        spLoad();
                        soLoad();
                        if ( $tbbShowSecureObjects.hasClass( "k-state-disabled" ) && $tbbShowSecurityPrincipals.hasClass( "k-state-disabled" ) ) {
                            k$tbMain.enable( $tbbShowSecureObjects, true );
                            k$tbMain.enable( $tbbShowSecurityPrincipals, true );
                            // default to secure object view
                            $( ID.TBB_SHOW_SECURE_OBJECTS ).click();
                        }
                    } )
                    .fail( () => {
                        // hide both views, disable buttons
                        k$tbMain.enable( $tbbShowSecureObjects, false );
                        k$tbMain.enable( $tbbShowSecurityPrincipals, false );
                        soHide();
                        spHide();
                    } )
            }
        } )
}

function tbbSwitchView(e: any) {
    switch ("#" + e.id) {
        case ID.TBB_SHOW_SECURITY_PRINCIPALS:
            soHide();
            spShow();
            break;
        case ID.TBB_SHOW_SECURE_OBJECTS:
            spHide();
            soShow();
            break;
        default:
            spHide();
            soHide();
    }
}

$(document).ready(function() {
    init();
    $("html").removeClass("no-fouc");
});

export {
    tbbRemoteRefreshClick,
    tbbSwitchView
};

export {
    spGetNameIconClass,
    spBtnNewClick,
    spBtnDeleteClick,
    spBtnSaveClick,
    spBtnDiscardClick,
    spBtnMemberOfAddClick,
    spBtnMembersAddClick,
    spMsMemberOfDataSource,
    spMsMembersDataSource,
    spLbMemberOfDataSource,
    spLbMembersDataSource,
    spGrdDataSourceChange
} from "./sp";
export {
    soTlDrop,
    soTbbNewClick,
    soTbbCopyClick,
    soTbbDeleteClick,
    soTbbExpandClick,
    soTbbCollapseClick,
    soBtnSaveClick,
    soBtnDiscardClick,
} from "./so";
