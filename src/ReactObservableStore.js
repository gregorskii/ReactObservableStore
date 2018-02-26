import React from 'react';
import set from 'lodash.set';
import get from 'lodash.get';
import assign from 'lodash.assign';
import clone from 'lodash.clonedeep';
import omit from 'lodash.omit';
import ObserverComponent from './ObserverComponent';

/**
 * Example of usage in top level application:
 *  import Store from 'react-observable-store';
 *  Store.init({ namespace: {foo: 'bar' }}, true);
 *
 * Example of usage in sub level component, ie. similar to redux connect usage:
 *  import { withStore } from 'react-observable-store';
 *  class MyComponent extends React.Component {};
 *  export default withStore('namespace', MyComponent);
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
    var observers = {};

    /**
     * Log current storage
     */
    function logging() {
        showLog && console && console.log('Store', storage);
    }

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
     *
     * @param {String} namespace    The namespace
     * @param {Object} data         The data to be stored
     * @param {Boolean} merge       The update method: merge or override
     */
    function updateStore(namespace, data, merge = true) {
        if (!storage[namespace]) throw new Error('Invalid namespace');
        storage[namespace] = assign(merge ? storage[namespace] : {}, sanitizeData(data));
        logging();
        fire(namespace, storage[namespace]);
    }

    /**
     * Method to init the storage
     *
     * @param {String} namespace   The namespace
     * @param {Object} data        The initial data to be stored
     */
    function init(data, log = false) {
        showLog = log;
        if (!data) throw new Error('Invalid store initialization');
        storage = assign({}, sanitizeData(data));
        for (let namespace in storage) observers[namespace] = {};
        logging();
    }

    /**
     * Get nested value
     * @param  {String} key The nested key
     * @return {Mixed}      The result
     */
    function getNested(key) {
        const segments = key.split('.');
        const result = get(storage, key, null);
        return result === Object(result) ? assign({}, result) : result;
    }

    /**
     * Set nested value
     * @param  {String} key     The nested key
     * @param  {Mixed}  value   The value to be set
     */
    function setNested(key, value) {
        const segments = key.split('.');
        set(storage, key, sanitizeData(value));
        logging();
        fire(segments[0], storage[segments[0]]);
    }

    /**
     * Allow components to subscribe to store updates
     *
     * @param {String}   namespace  The namespace
     * @param {Function} fn         The component updater
     */
    function subscribe(namespace, fn) {
        const id = generateObserverId();
        if (!observers[namespace]) throw new Error('Invalid namespace');
        observers[namespace][id] = fn;
        return id;
    }

    /**
     * Allow components to unsubscribe to store updates
     *
     * @param {String} namespace    The namespace
     * @param {String} id           The observer id
     */
    function unsubscribe(namespace, id) {
        observers[namespace] = omit(observers[namespace], [id]);
    }

    /**
     * Generate observer id
     * @return {String} The observer identifier
     */
    function generateObserverId() {
        return 'o_' + Math.random().toString(36).substring(2);
    }

    /**
     * Call subscribers to store updates
     *
     * @param {String}  namespace   The namespace
     * @param {Object}  data        The event/data
     * @param {Boolean} thisObj     The context
     */
    function fire(namespace, data, thisObj) {
        var scope = thisObj || window;
        Object.keys(observers[namespace]).forEach((id) => {
            observers[namespace][id].call(scope, data);
        });
    }

    /**
     * Creates a wrapper around the component that will receive the storage data
     *
     * @param  {String}             namesapce           The namespace to subscribe for updates
     * @param  {React.Component}    WrappedComponent    The new component
     * @return {React.Component}                        The resulting class
     */
    const createObserver = (namespace, WrappedComponent) => {

        // Get component class name
        var name = (WrappedComponent.prototype.constructor.displayName
            || WrappedComponent.prototype.constructor.name);

        /**
         * Returns the component wrapper
         * @type {Object}
         */
        return (props) => (
            <ObserverComponent
                name={name}
                input={props}
                storage={storage}
                sanitizeData={sanitizeData}
                subscribe={subscribe}
                unsubscribe={unsubscribe}
                namespace={namespace}
                render={(output) => <WrappedComponent {...output} />}
                >
            </ObserverComponent>
        )
    }

    /**
     * The public API methods
     * @type {Object}
     */
    return {

        // Initialize the store
        init: (data, log = false) => {
            init(data, log);
        },

        // Wraps the component with the store method
        withStore: (namespace, component) => {
            return createObserver(namespace, component);
        },

        // Updates the store
        update: (namespace, props, merge = true) => {
            updateStore(namespace, props, merge);
        },

        // Get a nested storage value by key. Levels separated by (.) dots
        get: (key) => {
            return getNested(key);
        },

        // Set a nested storage value by key. Levels separated by (.) dots
        set: (key, value) => {
            setNested(key, value);
        },

        /**
         * Subscribe to namespace
         * @param  {String}   namespace The namespace to subscribe
         * @param  {Function} fn        The subscription callback
         * @return {String}             The observer id
         */
        subscribe: (namespace, fn) => {
            return subscribe(namespace, fn);
        },

        /**
         * Unsubscribe to namespace
         * @param  {String} namespace The namespace to unsubscribe to
         * @param  {String} id        The observer id got from subsbribe method
         */
        unsubscribe: (namespace, id) => {
            return unsubscribe(namespace, id);
        }
    };
})();

// Export public API
export const withStore = Store.withStore;
export default Store;
