import Store, { withStore } from './ReactObservableStore';
import React from 'react';
import {mount, configure} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';

configure({ adapter: new Adapter() });

class Component extends React.Component {
    render() {
        return <div>{this.props.foo}</div>
    }
}

class ComponentSelfUpdate extends React.Component {
    componentDidMount() {
        Store.update('namespace', { foo: 'first'});
        Store.update('namespace', { foo: 'self update'});
    }
    render() {
        return <div>{this.props.foo}</div>
    }
}

test('throws error on empty init', () => {
    expect(() => {
        Store.init();
    }).toThrow();
});

test('throws error on invalid subscribe namespace on subscribe', () => {
    expect(() => {
        Store.subscribe('namespace', function upd(data) {});
    }).toThrow();
});

test('throws error on invalid subscribe namespace on withStore', () => {
    expect(() => {
        withStore('invalid', function upd(data) {});
    }).toThrow();
});

test('throws error on empty observer on withStore', () => {
    expect(() => {
        withStore('namespace');
    }).toThrow();
});

test('throws error on invalid update namespace', () => {
    expect(() => {
        Store.update('bla', {});
    }).toThrow();
});

test('init store', () => {
    var result = Store.get('namespace');
    expect(result).toBe(null);
    Store.init({ namespace: { foo: true }});
    Store.init({ namespace: { foo: true }}, true);
    Store.init({ namespace: { foo: true }}, false);
});

test('throws error on invalid observer on withStore', () => {
    expect(() => {
        withStore('namespace', { bla: {}});
    }).toThrow();
});

test('update store', () => {
    var result, value = false;
    result = Store.get('namespace');
    Store.update('namespace', { foo: value });
    result = Store.get('namespace.foo');
    expect(result).toBe(value);
    Store.update('namespace', { foo: value }, false);
    result = Store.get('namespace.foo');
    expect(result).toBe(value);
});

test('set and get from store', () => {
    Store.init({ namespace: { foo: {nested: true }}});
    var result, value = false;
    Store.set('namespace.foo.nested', value);
    result = Store.get('namespace.foo.nested');
    expect(result).toBe(value);
    result = Store.get('namespace.foo');
    expect(result).toEqual({nested: value});
});

test('update store returns null with non-serializable values', () => {
    var result, values = [
        NaN,
        Infinity
    ];
    values.map(item => {
        Store.update('namespace', { foo: item });
        result = Store.get('namespace.foo');
        expect(result).toEqual(null);
    });
});

test('update store succeeds with serializable values', () => {
    var result, values = [
      null,
      true,
      'bar',
      9999999999,
      [],
      [[]],
      ['foo'],
      ['foo', 99999999999],
      [1,2],
      {},
      [{}],
      {a: false},
      {a: []},
      {a: {}},
      {a: {a: null}}
    ];
    values.map(item => {
      Store.update('namespace', { foo: item });
      result = Store.get('namespace.foo');
      expect(result).toEqual(item);
    });
});

test('manual subscribe and unsubscribe', (done) => {
    const change = { foo: false }
    Store.init({ namespace: { foo: true }}, true);
    var id = Store.subscribe('namespace', function upd(data) {
        expect(data).toEqual(change);
        Store.unsubscribe('namespace', id);
        done();
    });
    Store.update('namespace', change);
});

test('test withStore for React.Component observer', () => {
    Store.init({ namespace: { foo: "bar" }}, true);
    const TestComp = withStore('namespace', Component);
    expect(TestComp).toEqual(expect.any(Function));
});

test('render withStore', () => {
    Store.init({ namespace: { foo: "bar" }}, true);
    const TestComp = withStore('namespace', Component)
    const wrapper = mount(<TestComp />);
    wrapper.unmount();
});

test('update observer', () => {
    Store.init({ namespace: { foo: "bar" }}, true);
    const TestComp = withStore('namespace', Component)
    const wrapper = mount(<TestComp />);
    Store.update('namespace', { foo: "baz" });
    expect(wrapper.find('div').text()).toEqual('baz');
});

test('self update', () => {
    Store.init({ namespace: { foo: "bar" }}, true);
    const TestComp = withStore('namespace', ComponentSelfUpdate)
    const wrapper = mount(<TestComp />);
    expect(wrapper.find('div').text()).toEqual('self update');
});
