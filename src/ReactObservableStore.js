var React = require('react');
var assign = require('lodash.assign');
var clone = require('lodash.clonedeep');
var omit = require('lodash.omit');
var ObserverComponent = require('./ObserverComponent');

/**
 * Example of usage in top level application:
 *  import Store from 'react-observable-store';
 *  Store.init({ foo: 'bar' }, true);
 *
 * Example of usage in sub level component, ie. similar to redux connect usage:
 *  import { withStore } from 'react-observable-store';
 *  class MyComponent extends React.Component {};
 *  export default withStore(MyComponent);
 *
 * After this, the store data can be used in component like as any other props:
 *  <p>{ this.props.foo }</p>
 */

/**
 * The global state store
 * @return {Object} The global state store
 */
const Store = (function () {

    /**
     * The private storage
     * @type {Object}
     */
    var storage = {};

    /**
     * Show store on console
     * @type {Boolean}
     */
    var showLog = false;

    /**
     * The store observers
     * @type {Array}
     */
    var observers = {
        'update': {}
    };

    /**
     * Sanitize allowed data to be stored, ie. only plain JS objects allowed
     * @param  {Object} data The data to be stored
     * @return {Object}      The sanitized data
     */
    function sanitizeData(data) {
        return clone(JSON.parse(JSON.stringify(data)));
    }

    /**
     * Method to update the storage data
     * @param  {Object} data The data to be stored
     */
    function updateStore(data, merge = true) {
        storage = merge ? assign(storage, sanitizeData(data))
            : assign({}, sanitizeData(data));
        showLog && console && console.log('Store', storage);
        fire('update', storage);
    };

    /**
     * Method to init the storage
     * TODO: can be overriden
     * @param  {Object} data The initial data to be stored
     */
    function init(data, log = false) {
        showLog = log;
        updateStore(data);
    };

    /**
     * Allow components to subscribe to store updates
     * @param  {eventName}  eventName   The event name
     * @param  {id}         The observer id
     * @param  {Function} fn The component updater
     */
    function subscribe(eventName, id, fn) {
        observers[eventName][id] = fn;
    };

    /**
     * Allow components to unsubscribe to store updates
     * @param  {eventName}  eventName    The event name
     * @param  {id}         The observer id
     */
    function unsubscribe(eventName, id) {
        observers[eventName] = omit(observers[eventName], [id]);
    };

    /**
     * Call subscribers to store updates
     * @param  {Object}  o       The event/data
     * @param  {Boolean} thisObj The context
     */
    function fire(eventName, o, thisObj) {
        var scope = thisObj || window;
        Object.keys(observers[eventName]).forEach((id) => {
            observers[eventName][id].call(scope, o);
        });
    };

    /**
     * Creates a wrapper around the component that will receive the storage data
     * @param  {React.Component} WrappedComponent  The new component
     * @return {class}                              The resulting class
     */
    const createObserver = (WrappedComponent) => {

        // Create component instance identifier
        var observerName = (WrappedComponent.prototype.constructor.displayName
            || WrappedComponent.prototype.constructor.name)
            + '_' + Math.random().toString(36).substring(2);

        /**
         * Returns the component wrapper
         * @type {Object}
         */
        return (props) => (
            <ObserverComponent
                name={observerName}
                input={props}
                storage={storage}
                sanitizeData={sanitizeData}
                subscribe={subscribe}
                unsubscribe={unsubscribe}
                component={WrappedComponent}
                >
            </ObserverComponent>
        )
    };

    /**
     * The public API methods
     * @type {Object}
     */
    return {

        // Initialize the store
        init: (props, log = false) => {
            init(props, log);
        },

        // Wraps the component with the store method
        withStore: (component) => {
            return createObserver(component);
        },

        // Updates the store
        update: (props) => {
            updateStore(props);
        },

        // Get the storage data as a cloned Object
        get: () => {
            return Object.assign({}, storage);
        }
    };
})();

// Export public API
export const withStore = Store.withStore;
export default Store;
