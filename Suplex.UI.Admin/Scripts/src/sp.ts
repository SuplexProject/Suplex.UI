import differenceBy from "lodash-es/differenceBy"; // gives you a smaller size than doing import difference from 'lodash'. It seems you can do the same thing with ES6 using Array.filter
import debounce from "lodash-es/debounce";
import * as ID from "./ids";
import {
    getActionUrl,
    decipherJqXhrError,
    showYesNoCancelDialog,
    showYesNoDialog,
    showProgress,
    hideProgress,
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
let $spEditorError = $( ID.SP_EDITOR_ERROR );
let $spMsMemberOf = $( ID.SP_MULTISELECT_MEMBER_OF );
let $spMsMembers = $( ID.SP_MULTISELECT_MEMBERS );
let $spLbMemberOf = $(ID.SP_LISTBOX_MEMBER_OF);
let $spLbMembers = $( ID.SP_LISTBOX_MEMBERS );
let $spTlGroupHierarchy = $( ID.SP_TREELIST_GROUP_HIERARCHY );

let $spTxtGrdFilter: JQuery; // value set in setupVariables 

let validator: kendo.ui.Validator = null;

let k$spGrd: kendo.ui.Grid = null;
let k$spMsMemberOf: kendo.ui.MultiSelect;
let k$spMsMembers: kendo.ui.MultiSelect;
let k$spLbMemberOf: kendo.ui.ListBox = null;
let k$spLbMembers: kendo.ui.ListBox = null;
let k$spTlGroupHierarchy: kendo.ui.TreeList = null;
let k$spSpltr: kendo.ui.Splitter = null;

export let trustees: any[] = [];

export let spGrdDataSource: kendo.data.DataSource = null;

export let spMsMemberOfDataSource: kendo.data.DataSource = new kendo.data.DataSource( {
    data: [],
    schema: {
        model: {
            id: "UId"   // required so we can call the datasource get method
        }
    },
    sort: { field: "Name", dir: "asc" }
} )
export let spMsMembersDataSource: kendo.data.DataSource = new kendo.data.DataSource( {
    data: [],
    schema: {
        model: {
            id: "UId"
        }
    },
    sort: [
        { field: "Source", dir: "desc" },
        { field: "Name", dir: "asc" }
    ]
})
export let spLbMemberOfDataSource: kendo.data.DataSource = new kendo.data.DataSource( {
    data: [],
    schema: {
        model: {
            id: "UId"  // needed so we can call datasource.get(UId)
        }
    },
    sort: { field: "Name", dir: "asc" },
    push: function ( e: kendo.data.DataSourcePushEvent ) {
        //console.log( "push", e );
        setVMEditorHasChangesFlag( true );
    }
} )
export let spLbMembersDataSource: kendo.data.DataSource = new kendo.data.DataSource( {
    data: [],
    schema: {
        model: {
            id: "UId"  // needed so we can call datasource.get(UId)
        }
    },
    sort: [
        { field: "Source", dir: "desc" },
        { field: "Name", dir: "asc" }
    ],
    push: function ( e: kendo.data.DataSourcePushEvent ) {
        //console.log( "push", e );
        setVMEditorHasChangesFlag( true );
    }
})
let memberOfOriginal: any[] = [];
let membersOriginal: any[] = [];

let spEditorModel = kendo.data.Model.define( {
    id: "UId",
    fields: {
        UId: { editable: false },
        Name: {
            type: "string",
            validation: { required: true },
        },
        Description: { type: "string" },
        IsUser: { type: "boolean" },
        IsEnabled: { type: "boolean" },
        IsLocal: { type: "boolean" },
        Mask: { type: "string" },
    },
});

let spGrdModel = kendo.data.Model.define( {
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

let spVM = kendo.observable( {
    visible: false,
    selectedUId: null,
    editor: {
        visible: false,
        hasChanges: false,
        hasError: false,
        model: null,
        isLocalGroup: function () {
            if ( this.get( "model" ) ) {
                return !this.model.get( "IsUser" ) && this.model.get( "IsLocal" );
            } else {
                return false;
            }
        },
        reset: function ( showEditor: boolean ) {
            if ( showEditor == undefined ) {
                showEditor = false;
            }
            if ( showEditor != this.get( "visible" ) ) {
                this.set( "visible", showEditor );
                if ( showEditor )
                    k$spSpltr.resize( true );
            }

            this.set( "hasChanges", false );
            this.set( "hasError", false );
            this.set( "model", new spEditorModel() );
        },
        raiseChange: function () {
            let that = this;
            if ( that.editor.get( "hasChanges" ) ) return;
            that.editor.set( "hasChanges", true );
        },
    },
    securityPrincipalSelected: function () {
        return this.get( "selectedUId" ) != null;
    },
    reset: function () {
        // this.set( "visible", false )  // visible property determined by main.js
        this.set( "selectedUId", null );
        this.editor.reset();
    },
} );

// view model
function setVMEditorHasErrorFlag( trueorfalse: boolean ): void {
    if ( ( spVM as any ).editor.get( "hasError" ) == trueorfalse ) return;
    ( spVM as any ).editor.set( "hasError", trueorfalse );
}
function setVMEditorHasChangesFlag( trueorfalse: boolean ): void {
    if ( ( spVM as any ).editor.get( "hasChanges" ) == trueorfalse ) return;
    ( spVM as any ).editor.set( "hasChanges", trueorfalse );
}
function setVMSelectedUId( uId: string ) {
    if ( spVM.get( "selectedUId" ) != uId ) {
        spVM.set( "selectedUId", uId );
    }
}
export function spSetup(): void {
    kendo.bind( $spView, spVM );

    setupWidgets();

    setupVariables();

    setupEventHandlers();
    k$spGrd.dataSource.data( [] );
}

function setupWidgets(): void {
    validator = $spEditor
        .kendoValidator( {
            validateOnBlur: false,
            validate: function () {
                $( "span.k-invalid-msg" ).hide();
            },
        } )
        .data( "kendoValidator" );

    $spTlGroupHierarchy.kendoTreeList( {
        dataSource: {
            data: [],
            schema: {
                model: {
                    id: "Id",  //"MemberUId",
                    parentId: "ParentId", //"GroupUId",
                    expanded: true,
                    fields: {
                        //MemberUId: { type: "string", nullable: false },
                        //GroupUId: { type: "string", nullable: true },
                        Id: { type: "number", nullable: false },
                        ParentId: { type: "number", nullable: true },
                    },
                },
            },
            sort: [
                { field: "IsUser", dir: "desc" },
                { field: "IsLocal", dir: "desc" },
                { field: "Name", dir: "asc" }
            ],
        },
        columns: [
            { field: "Name", template: $( "#spNameTemplate" ).html() },
            { field: "Description" }
        ],
        selectable: true,
    } );
}

function setupEventHandlers(): void {
    // need to test on IE 11
    $( window )
        .resize( debounce( resizeSplitter, 500 ) )
        .trigger( "resize" );

    // click comes after grid change event
    $spGrd.on( "click", "tbody tr", spGrdClick );

    // security principals filter
    $spTxtGrdFilter.on( "input", function ( e ) {
        e.preventDefault();
        //var value = $(e.target).val()
        let searchString = $( this ).val() as string;
        if ( searchString.length > 0 ) {
            // there is text
            k$spGrd.dataSource.filter( {
                field: "Name",
                operator: "contains",
                value: searchString,
            } );
        } else {
            k$spGrd.dataSource.filter( {} );
        }
    } );
    $( ID.SP_BTN_CLEAR_TXT_GRD_FILTER ).on( 'click', function ( e ) {
        $spTxtGrdFilter.val( "" ).trigger( "input" ).focus();
    } );

    k$spLbMemberOf.wrapper.find( ".k-list" ).on( "click", ".k-item .clickable", function ( e ) {
        //console.log( "In MemberOf listbox item click event handler..." );
        let item: JQuery = $( e.target ).closest( ".k-item" );
        let dataItem: any = k$spLbMemberOf.dataItem( item );
        if ( !spMsMemberOfDataSource.get( dataItem.UId ) ) {
            spMsMemberOfDataSource.add( dataItem );
        }
        spLbMemberOfDataSource.pushDestroy( dataItem );
    } )
    k$spLbMembers.wrapper.find( ".k-list" ).on( "click", ".k-item .clickable", function ( e ) {
        //console.log( "In Members listbox item click event handler..." );
        let item: JQuery = $( e.target ).closest( ".k-item" );
        let dataItem: any = k$spLbMembers.dataItem( item );
        if ( !spMsMembersDataSource.get( dataItem.UId ) ) {
            spMsMembersDataSource.add( dataItem );
        }
        spLbMembersDataSource.pushDestroy( dataItem );
    } )

}

function setupVariables() {
    $spTxtGrdFilter = $( ID.SP_TXT_GRD_FILTER );
    k$spGrd = $spGrd.data( "kendoGrid" );
    k$spMsMemberOf = $spMsMemberOf.data( "kendoMultiSelect" );
    k$spMsMembers = $spMsMembers.data( "kendoMultiSelect" );
    k$spLbMemberOf = $spLbMemberOf.data( "kendoListBox" );
    k$spLbMembers = $spLbMembers.data( "kendoListBox" );
    k$spTlGroupHierarchy = $spTlGroupHierarchy.data( "kendoTreeList" );
    k$spSpltr = $spSpltr.data( "kendoSplitter" );
    spGrdDataSource = k$spGrd.dataSource;
}

function resizeSplitter() {
    //console.log("In resizeSplitter...");
    let top = 85; //125; // height occupied above splitter
    let bottom = 25; // height occupied below splitter
    let height = $( window ).height() - ( top + bottom ) - 1;
    height = height <= 0 ? 100 : height;
    k$spSpltr.wrapper.height( height );
    k$spSpltr.resize( true );
}
export function spReset(): void {
    ( spVM as any ).reset();
    resetEditor( false );
    k$spGrd.dataSource.data( [] );
}
export function spShow(): void {
    if ( !spVM.get( "visible" ) ) {
        spVM.set( "visible", true );
        k$spSpltr.resize();
    }
}

export function spHide(): void {
    if ( spVM.get( "visible" ) ) spVM.set( "visible", false );
}

export function spLoad(): void {
    k$spGrd.dataSource.read();
}

function spGrdClick(): void {
    console.log( "In spGrdClick..." );

    // click event is triggered after change event. so by now we would have the selected row
    let selectedItem: any = k$spGrd.dataItem( k$spGrd.select() );
    console.log( selectedItem );

    if ( !selectedItem ) return;

    // do nothing if the editor is already showing the same record
    if ( spVM.get( "selectedUId" ) == selectedItem.UId && selectedItem.UId == ( spVM as any ).editor.model.get( "UId" ) ) {
        return;
    }

    spVerifySaveChanges().then( function ( proceed ) {
        console.log( "-- " + proceed );
        if ( proceed ) {
            selectGridItem( selectedItem.UId ); // verifySaveChanges() could have cleared/changed the selection
            resetEditor( true );
            ( spVM as any ).editor.model.set( "IsUser", selectedItem.IsUser ); // to ensure the correct view is displayed

            $.when( showProgress() )
                .then( () => {
                    if ( selectedItem.IsUser ) {
                        return getUser( selectedItem.UId );
                    }
                    else {
                        return getGroup( selectedItem.UId );
                    }
                } )
                .done( ( data: AjaxResponse ) => {
                    if ( data.Status == AjaxResponseStatus.Success ) {
                        populateEditor( data );
                    } else {
                        notifyError( `There is a problem retrieving ${selectedItem.IsUser ? "User" : "Group"} information.` );
                    }
                } )
                .fail( function () {
                    notifyError( `There is a problem retrieving ${selectedItem.IsUser ? 'User' : 'Group'} information.` );
                } )
                .always( hideProgress );
        } else {
            // restore previous grid selection
            selectGridItem( spVM.get( "selectedUId" ) );
        }
    } );
}

export function spVerifySaveChanges(): JQueryPromise<boolean> {
    console.log( "In spVerifySaveChanges..." );
    let dfd = $.Deferred<boolean>();

    if ( !( spVM as any ).editor.get( "hasChanges" ) ) {
        dfd.resolve( true );
    } else {
        let isEditingUser = ( spVM as any ).editor.model.get( "IsUser" );
        let message = `Save changes to ${( isEditingUser ? "User" : "Group" )} <b>${( spVM as any ).editor.model.get( "Name" )}</b> ?`;
        //let message = "Save changes to " + (isEditingUser ? "User " : "Group ") + (spVM as any).editor.model.get("Name") + "?";
        $.when( showYesNoCancelDialog( "Save changes", message ) )
            .then( ( response: DialogResponse ): void => {
                console.log( "-- Response is " + response );
                switch ( response ) {
                    case DialogResponse.Yes: // go ahead and save
                        clearEditorErrors();
                        if ( validateEditor() ) {
                            if ( isEditingUser ) {
                                $.when( showProgress() )
                                    .then( saveUser )
                                    .then( processSaveActionResponse )
                                    .then( () => {
                                        dfd.resolve( true );
                                    } )
                                    .fail( () => {
                                        dfd.resolve( false );
                                    } )
                                    .always( hideProgress )

                            } else {
                                $.when( showProgress() )
                                    .then( saveGroup )
                                    .then( processSaveActionResponse )
                                    .then( () => {
                                        dfd.resolve( true );
                                    } )
                                    .fail( () => {
                                        dfd.resolve( false );
                                    } )
                                    .always( hideProgress )
                            }
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
            } );
    }

    return dfd.promise();
}

function populateEditor( data: AjaxResponse ): void {
    console.log( "In populateEditor..." );
    if ( data ) {
        if ( data.Data.User ) {
            ( spVM as any ).editor.set( "model", data.Data.User );
            membersOriginal = [];
            memberOfOriginal = JSON.parse( JSON.stringify( data.Data.MemberOf ) ); // clone
            k$spLbMemberOf.dataSource.data( data.Data.MemberOf );
            k$spLbMembers.dataSource.data( [] );
            k$spMsMemberOf.value( [] )
            k$spMsMembers.value( [] )
            spMsMemberOfDataSource.data( data.Data.NotMemberOf );
            spMsMembersDataSource.data( [] );
            k$spTlGroupHierarchy.dataSource.data( [] );
        } else if ( data.Data.Group ) {
            ( spVM as any ).editor.set( "model", data.Data.Group );
            memberOfOriginal = JSON.parse( JSON.stringify( data.Data.MemberOf ) ); // clone
            membersOriginal = JSON.parse( JSON.stringify( data.Data.Members ) ); // clone
            k$spLbMemberOf.dataSource.data( data.Data.MemberOf );
            k$spLbMembers.dataSource.data( data.Data.Members );
            k$spMsMemberOf.value( [] )
            k$spMsMembers.value( [] )
            spMsMemberOfDataSource.data( data.Data.NotMemberOf );
            spMsMembersDataSource.data( data.Data.NotMembers );
            k$spTlGroupHierarchy.dataSource.data( data.Data.GroupHierarchy );
        }
    }
}
function resetEditor( showEditor: boolean ): void {
    ( spVM as any ).editor.reset( showEditor );
    k$spMsMemberOf.value( [] )
    k$spMsMembers.value( [] )
    k$spLbMemberOf.dataSource.data( [] );
    k$spLbMembers.dataSource.data( [] );
    spMsMemberOfDataSource.data( [] );
    spMsMembersDataSource.data( [] );
    k$spTlGroupHierarchy.dataSource.data( [] );
    clearEditorErrors();
    memberOfOriginal = [];
    membersOriginal = [];
}

export function spGetNameIconClass( IsUser: boolean, IsLocal: boolean ): string {
    let cls = IsUser ? "icon-user" : IsLocal ? "icon-group" : "icon-group-ext";
    return "k-sprite " + cls;
}

export function spBtnSaveClick(): void {
    // TODO: Put explicit type
    console.log( "In spBtnSaveClick..." );
    clearEditorErrors();
    if ( validateEditor() ) {
        if ( ( spVM as any ).editor.model.get( "IsUser" ) ) {
            $.when( showProgress() )
                .then( saveUser )
                .then( processSaveActionResponse )
                .always( hideProgress );
        }
        else {
            $.when( showProgress() )
                .then( saveGroup )
                .then( processSaveActionResponse )
                .always( hideProgress );
        }
    }

}
function processSaveActionResponse( data: AjaxResponse ): JQueryPromise<void> {
    console.log( "In processSaveActionResponse..." );
    let dfd = $.Deferred<void>();


    if ( data.Status == AjaxResponseStatus.Success ) {

        let model = null;
        if ( data.Data.User ) {
            model = data.Data.User;
        } else if ( data.Data.Group ) {
            model = data.Data.Group;
        }
        if ( model ) {
            setVMEditorHasChangesFlag( false );
            populateEditor( data );
            // ( spVM as any ).editor.set( "model", model );

            updateGrid(
                new spGrdModel( {
                    UId: model.UId,
                    Name: model.Name,
                    Description: model.Description,
                    IsEnabled: model.IsEnabled,
                    IsUser: model.IsUser,
                    IsLocal: model.IsLocal,
                    Source: model.IsUser ? "User" : model.IsLocal ? "Local (Suplex)" : "External",
                } )
            );
            // above action will cause grid selection to clear, so we need to select the row again
            selectGridItem( model.UId );

            notifySuccess( `${model.IsUser ? 'User' : 'Group'} <b>${model.Name}</b> saved.` );
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
            setVMEditorHasErrorFlag( true );
        }
        notifyError( `Please correct the error(s) on the form first and try again.` );
        dfd.reject();
    }
    return dfd.promise();
}

function saveUser(): JQueryPromise<AjaxResponse> {
    console.log( "In saveUser..." );
    let memberOf = k$spLbMemberOf.dataSource.data();
    let memberOfToAdd = differenceBy( memberOf, memberOfOriginal, "UId" );
    let memberOfToRemove = differenceBy( memberOfOriginal, memberOf, "UId" );
    return $.ajax( {
        method: "POST",
        url: getActionUrl( "SaveUser", "Admin" ),
        contentType: "application/json",
        data: JSON.stringify( {
            User: ( spVM as any ).editor.get( "model" ),
            MemberOfToAdd: memberOfToAdd,
            MemberOfToRemove: memberOfToRemove,
        } ),
        dataType: "json",
    } )
        .then( ( data: AjaxResponse ) => { return $.Deferred().resolve( data ) } )
        .fail( ( jqXHR: JQueryXHR, textStatus: string ) => {
            let msg = decipherJqXhrError( jqXHR, textStatus );
            notifyError( `There is a problem saving User.<br/>${msg}` )
            return $.Deferred().reject();
        } );
}

function saveGroup(): JQueryPromise<AjaxResponse> {
    console.log( "In saveGroup..." );
    let members = k$spLbMembers.dataSource.data();
    let memberOf = k$spLbMemberOf.dataSource.data();
    let membersToAdd = [];
    let membersToRemove = [];
    let memberOfToAdd = [];
    let memberOfToRemove = [];
    memberOfToAdd = differenceBy( memberOf, memberOfOriginal, "UId" );
    memberOfToRemove = differenceBy( memberOfOriginal, memberOf, "UId" );
    if ( ( spVM as any ).editor.model.get( "IsLocal" ) ) {
        membersToAdd = differenceBy( members, membersOriginal, "UId" );
        membersToRemove = differenceBy( membersOriginal, members, "UId" );
    }

    return $.ajax( {
        method: "POST",
        url: getActionUrl( "SaveGroup", "Admin" ),
        contentType: "application/json",
        data: JSON.stringify( {
            Group: ( spVM as any ).editor.get( "model" ),
            MemberOfToAdd: memberOfToAdd,
            MemberOfToRemove: memberOfToRemove,
            MembersToAdd: membersToAdd,
            MembersToRemove: membersToRemove
        } ),
        dataType: "json",
    } )
        .then( ( data: AjaxResponse ) => { return $.Deferred().resolve( data ) } )
        .fail( ( jqXHR: JQueryXHR, textStatus: string ) => {
            let msg = decipherJqXhrError( jqXHR, textStatus );
            notifyError( `There is a problem saving Group.<br/>${msg}` )
            return $.Deferred().reject();
        } );
}

function validateEditor(): boolean {
    console.log( "In validateEditor..." );
    let msg: string = "";
    if ( k$spMsMemberOf.value().length != 0 ) {
        msg += "Complete the 'Member Of' section<br/>";
    }
    if ( ( spVM as any ).editor.isLocalGroup() && k$spMsMembers.value().length != 0 ) {
        msg += "Complete the 'Members' section<br/>";
    }
    if ( !validator.validate() ) {
        let errors = validator.errors();
        $( errors ).each( function () {
            msg += this + "<br/>";
        } );
    }
    if ( msg.length > 0 ) {
        $spEditorError.html( msg );
        setVMEditorHasErrorFlag( true );
    }

    return ( msg.length == 0 ? true : false );
}
function selectGridItem( uId: string ): void {
    if ( !uId ) return;

    console.log( "In selectGridItem..." );
    setVMSelectedUId( uId );

    let ds = k$spGrd.dataSource;
    // if is already selected, don't select again
    let currentSelectedItem: any = k$spGrd.dataItem( k$spGrd.select() );
    if ( !currentSelectedItem || ( uId !== currentSelectedItem.uId ) ) {
        let rowuid = ds.get( uId ).uid;
        let foundrow = k$spGrd.table.find( 'tr[data-uid="' + rowuid + '"]' );
        if ( foundrow.length > 0 ) {
            k$spGrd.select( foundrow );
        } else {
            clearGridSelection();
            console.log( "-- Cannot locate grid item with UId " + uId );
        }
    }
}
function clearGridSelection() {
    k$spGrd.clearSelection();
    setVMSelectedUId( null );
}
function updateGrid( gridModel: any ): void {
    // TODO: Put explicit type
    console.log( "In updateGrid..." );
    console.log( gridModel );

    let ds = k$spGrd.dataSource;

    // pushUpdate doesn't seem to work well
    // ds.pushUpdate( gridModel )

    // if using set method, to hide the dirty indicators, follow https://docs.telerik.com/kendo-ui/knowledge-base/disable-dirty-indicator-using-css
    let dataItem = ds.get( gridModel.UId );
    if ( typeof dataItem !== "undefined" ) {
        dataItem.set( "Name", gridModel.Name );
        dataItem.set( "Description", gridModel.Description );
        dataItem.set( "IsEnabled", gridModel.IsEnabled );
        dataItem.set( "IsUser", gridModel.IsUser );
        dataItem.set( "IsLocal", gridModel.IsLocal );
        dataItem.set( "Source", gridModel.Source );
    } else {
        // assume new record
        ds.add( gridModel );
        console.log( "-- New item added to security principals grid" );
    }


}
function clearEditorErrors(): void {
    $spEditorError.empty();
    setVMEditorHasErrorFlag( false );
}

export function spBtnDiscardClick(): void {
    // TODO: Put explicit type
    console.log( "In spBtnDiscardClick..." );

    if ( ( spVM as any ).editor.get( "hasChanges" ) ) {
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

export function spBtnNewClick( e: any ): void {
    console.log( "In spBtnNewClick..." );

    switch ( "#" + e.id ) {
        case ID.SP_BTN_NEW:
            console.log( "-- new" );
            //https://www.telerik.com/forums/open-split-button-with-js
            let $btn = $( "#" + e.id ).closest( '.k-split-button' );
            let popup = $btn.data( "kendoPopup" );
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
            //console.log( "-- new user" );
            newUser();
            break;

        case ID.SP_BTN_NEW_GROUP:
            //console.log( "-- new group" );
            newGroup();
            break;
    }
}

function newUser(): void {
    // TODO: Put explicit type


    spVerifySaveChanges().then( function ( proceed ) {

        if ( proceed ) {
            // go ahead and prepare the editor
            resetEditor( true );
            ( spVM as any ).editor.model.set( "IsUser", true ); // ensures the user view is displayed
            getNewUser()
                .done( ( data: AjaxResponse ) => {
                    if ( data.Status == AjaxResponseStatus.Success ) {
                        data.Data.User.Name = "New User";   // default the name
                        populateEditor( data );
                        clearGridSelection();
                    } else {
                        notifyError( "Error retrieving information for new user" );
                    }
                } )
                .fail( ( jqXHR: JQueryXHR, textStatus: string ) => {
                    let errorMsg = decipherJqXhrError( jqXHR, textStatus );
                    notifyError( errorMsg );
                } );
        }
    } );
}
function newGroup(): void {
    // TODO: Put explicit type

    spVerifySaveChanges().then( function ( proceed ) {

        if ( proceed ) {
            // go on and prepare the editor
            resetEditor( true );
            ( spVM as any ).editor.model.set( "IsUser", false ); // to make sure the correct fields are displayed
            getNewGroup()
                .done( ( data: AjaxResponse ) => {
                    if ( data.Status == AjaxResponseStatus.Success ) {
                        data.Data.Group.Name = "New Group";   // default the name
                        populateEditor( data );
                        clearGridSelection();
                    } else {
                        notifyError( "Error retrieving information for new group" );
                    }
                } )
                .fail( ( jqXHR: JQueryXHR, textStatus: string ) => {
                    let errorMsg = decipherJqXhrError( jqXHR, textStatus );
                    notifyError( errorMsg );
                } );
        }
    } );
}

export function spBtnDeleteClick(): void {
    // TODO: Put explicit type
    console.log( "In spBtnDeleteClick..." );

    // get the selected item
    let itemToDelete: any = k$spGrd.dataItem( k$spGrd.select() ); // TODO; Put explicit type
    if ( !itemToDelete ) return;

    let message = `Are you sure you want to delete ${itemToDelete.IsUser ? "User " : "Group "} <b>${itemToDelete.Name}</b> ?`;

    let action = itemToDelete.IsUser ? "DeleteUser" : "DeleteGroup";
    $.when( showYesNoDialog( "Confirm Delete", message ) )
        .then( ( response: DialogResponse ) => {
            if ( response == DialogResponse.Yes ) {
                // ok
                $.when( showProgress() )
                    .then( () => {
                        return $.post( getActionUrl( action, "Admin" ), { uId: itemToDelete.UId } )
                            .then( data => {
                                return $.Deferred().resolve( data );
                            } )
                            .fail( ( jqXHR: JQueryXHR, textStatus: string ) => {
                                let msg = decipherJqXhrError( jqXHR, textStatus );
                                notifyError( `There is a problem deleting ${itemToDelete.IsUser ? "User" : "Group"} <b>${itemToDelete.Name}.</b><br/>${msg}` );
                                $.Deferred().reject();
                            } );
                    } )
                    .then( ( data: AjaxResponse ) => {
                        return processDeleteActionResponse( data, itemToDelete );
                    } )
                    .always( hideProgress );
            }
        } );
}

function processDeleteActionResponse( data: AjaxResponse, gridDataItemToDelete: any ): JQueryPromise<void> {
    if ( data.Status == AjaxResponseStatus.Success ) {
        let ds: kendo.data.DataSource = k$spGrd.dataSource;
        ds.remove( gridDataItemToDelete );
        setVMSelectedUId( null );

        // see if we need to reset editor
        if ( spVM.get( "editor.visible" ) && spVM.get( "editor.model.UId" ) == gridDataItemToDelete.UId ) {
            resetEditor( false );
            clearGridSelection();
        }

        notifySuccess( `${gridDataItemToDelete.IsUser ? 'User' : 'Group'} <b>${gridDataItemToDelete.Name}</b> deleted successfully.` );
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
function getUser( uId: string ): JQueryXHR {
    return $.ajax( {
        method: "GET",
        url: getActionUrl( "GetUserByUId", "Admin" ),
        data: { uId: uId },
        dataType: "json",
    } );
}
function getNewUser(): JQueryXHR {
    return $.ajax( {
        method: "GET",
        url: getActionUrl( "GetNewUser", "Admin" ),
        dataType: "json",
    } );
}
function getGroup( uId: string ): JQueryXHR {
    console.log( "In getGroup..." );

    return $.ajax( {
        method: "GET",
        url: getActionUrl( "GetGroupByUId", "Admin" ),
        data: { uId: uId },
        dataType: "json",
    } );
}
function getNewGroup(): JQueryXHR {
    return $.ajax( {
        method: "GET",
        url: getActionUrl( "GetNewGroup", "Admin" ),
        dataType: "json",
    } );
}
export function spBtnMemberOfAddClick( e: MouseEvent ) {
    console.log( "In spBtnMemberOfAddClick..." )
    let selectedItems: any[] = k$spMsMemberOf.dataItems();
    if ( selectedItems.length == 0 ) return;

    //selectedItems.forEach( ( item ) => {
    //if ( item.UId == ( spVM as any ).editor.model.get( "UId" ) ) {
    //    return;
    //}
    //if ( spLbMemberOfDataSource.get( item.UId ) === undefined ) {
    //    spLbMemberOfDataSource.pushCreate( item );
    //}
    //} )
    k$spMsMemberOf.value( [] ); // clear selected items
    spLbMemberOfDataSource.pushCreate( selectedItems );
    spMsMemberOfDataSource.pushDestroy( selectedItems );

}
export function spBtnMembersAddClick( e: MouseEvent ) {
    console.log( "In spBtnMembersAddClick..." )
    let selectedItems: any[] = k$spMsMembers.dataItems();
    if ( selectedItems.length == 0 ) return;

    //selectedItems.forEach( ( item ) => {
    //if ( item.UId == ( spVM as any ).editor.model.get( "UId" ) ) {
    //    return;
    //}
    //if ( spLbMembersDataSource.get( item.UId ) === undefined ) {
    //    spLbMembersDataSource.pushCreate( item );
    //}
    //} )
    k$spMsMembers.value( [] );
    spLbMembersDataSource.pushCreate( selectedItems );
    spMsMembersDataSource.pushDestroy( selectedItems );
}

