import * as ID from "./ids.js"
import debounce from 'lodash/debounce'

var _$secureObjectsView = $( ID.SECURE_OBJECTS_VIEW )
var _$tvSecureObjects = $( ID.TREEVIEW_SECURE_OBJECTS )
var _$spltrSecureObjects = $( ID.SPLITTER_SECURE_OBJECTS )

var _k$tvSecureObjects = null

var _soEditorModel = kendo.data.Model.define( {
    id: "UId",
    fields: {
        UId: { editable: false },
        UniqueName: {
            type: "string", validation: { required: true }
        },
        Description: { type: "string" }
    }
} )

var soVM = new kendo.observable( {
    visible: false,
    selectedUId: null,
    editor: {
        visible: false,
        hasChanges: false,
        hasError: false,
        model: null,
        reset: function () {
            this.set( "visible", false )
            this.set( "hasChanges", false )
            this.set( "hasError", false )
            this.set( "model", new _soEditorModel() ) 
        },
        raiseChange: function ( e ) {
            var that = this
            that.editor.set( "hasChanges", true )
        }
    },
    secureObjectSelected: function () {
        return ( this.get( "selectedUId" ) != null )
    },
    reset: function () {
        // this.set( "visible", false )  // visibility determined by main.js
        this.set( "selectedUId", null )
        this.editor.reset()
    }
})

export function setupSecureObjects() {
    kendo.bind( _$secureObjectsView, soVM )

    //setupDataSources()
    setupWidgets()

    setupVariables()

    setupEventHandlers()

}
function setupWidgets() { }
function setupVariables() {
    _k$tvSecureObjects = _$tvSecureObjects.data( 'kendoTreeView' )
}
function setupEventHandlers() {
    $( window ).resize( debounce( resizeSplitter, 500 ) ) 
}

export function showSecureObjects() {
    if ( !soVM.get( "visible" ) )
        soVM.set( "visible", true )
}
export function hideSecureObjects() {
    if ( soVM.get( "visible" ) )
        soVM.set( "visible", false )
}
export function resetSecureObjects() {
    soVM.reset()
    //resetEditor( false )
    _k$tvSecureObjects.dataSource.data([])
}
export function loadSecureObjectsTree() {
    _k$tvSecureObjects.dataSource.read()
}
function resizeSplitter() {
    console.log( "In resizeSplitter..." )
    var top = 125  // height occupied above splitter
    var bottom = 25 // height occupied below splitter
    var height = $( window ).height() - ( top + bottom )
    height = ( height <= 0 ) ? 100 : height
    _$spltrSecureObjects.height( height )
    _$spltrSecureObjects.data( 'kendoSplitter' ).resize()
}
export function btnExpandAllSecureObjectsClick( e ) {
    _k$tvSecureObjects.expand( ".k-item" );
}
export function btnCollapseAllSecureObjectsClick( e ) {
    _k$tvSecureObjects.collapse( ".k-item" );
}
export function btnNewSecureObjectClick( e ) {

}
export function btnDeleteSecureObjectsClick( e ) {

}
export function tvSecureObjectsChange( e ) {
    console.log( "In tvSecureObjectsChange..." )
    var selectedItem = _k$tvSecureObjects.dataItem( _k$tvSecureObjects.select() ) 
    console.log( selectedItem )

    if ( !selectedItem ) return

    if ( ( soVM.get( "selectedUId" ) == selectedItem.UId ) && ( selectedItem.UId == soVM.editor.model.get( "UId" ) ) ) {
        return
    }
    soVM.set( "selectedUId", selectedItem.UId )
    // get the secureobject & populate editor

}