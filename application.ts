import path from 'path';
import type { IContainer } from '@ostro/contracts/container/application';
import ApplicationContract from '@ostro/contracts/container/application';
import { IsClass, isset, is_null } from '@ostro/support/function';
import { Macroable } from '@ostro/support/macro';

interface BindingDefinition {
    callback: any;
    shared: boolean;
    parameters: any[];
}

/**
 * Service container and dependency injection application core.
 */
class Application extends Macroable.extend(ApplicationContract) implements IContainer {

    /**
     * Dynamic index signature for registered services and attributes.
     */
    [key: string]: any;

    /**
     * The container's shared instances cache.
     */
    $instances: Record<string, any> = {};

    /**
     * The container's bindings definitions.
     */
    $bindings: Record<string, BindingDefinition> = {};

    /**
     * The registered type aliases.
     */
    $aliases: Record<string, string> = {};

    /**
     * The resolved types registry.
     */
    $resolved: Record<string, boolean> = {};

    /**
     * The container's scoped instances.
     */
    $scopedInstances: Record<string, any> = {};

    /**
     * The globally set current container instance.
     */
    $instance: Application | null = null;

    /**
     * Register global aliases on the Node.js global object.
     *
     * @param alias - Key-value map of global alias names to target objects/classes.
     * @returns void
     */
    alias(alias: Record<string, any> = {}): void {
        for (const aliasKey in alias) {
            (global as any)[aliasKey] = alias[aliasKey];
        }
    }

    /**
     * Wrap the given closure so its dependencies are injected when executed.
     *
     * @param $callback - Target callback to wrap.
     * @param $parameters - Parameters to pass on invocation.
     * @returns Wrapped function.
     */
    wrap($callback: Function, $parameters: any[] = []): Function {
        return function (this: any) {
            return this.apply($callback, $parameters);
        };
    }

    /**
     * Call the given callback and inject its dependencies.
     *
     * @typeParam T - Expected return type of the callback.
     * @param $callback - Target callback, class method, or tuple [instance, methodName].
     * @param $parameters - Additional parameters.
     * @returns The callback execution result.
     */
    call<T = any>($callback: any, $parameters: any[] = []): T {
        if (typeof $callback === 'function') {
            $callback = $callback(this);
        }
        if (Array.isArray($callback)) {
            $callback = $callback[0][$callback[1]].bind($callback[0]);
        }
        return $callback.apply({ $app: this }, $parameters);
    }

    /**
     * Get a closure that resolves the given type from the container.
     *
     * @typeParam T - Resolved instance type.
     * @param $abstract - The abstract identifier to resolve.
     * @returns Closure resolving the abstract.
     */
    factory<T = any>($abstract: any): () => T {
        return (): T => {
            return this.make<T>($abstract);
        };
    }

    /**
     * An alias function for make() with parameters.
     *
     * @typeParam T - Resolved instance type.
     * @param $abstract - The abstract identifier.
     * @param $parameters - Parameters to construct the instance.
     * @returns Resolved instance.
     */
    makeWith<T = any>($abstract: any, ...$parameters: any[]): T {
        return this.make<T>($abstract, ...$parameters);
    }

    /**
     * Resolve the given type from the container.
     *
     * @typeParam T - Resolved instance type.
     * @param $abstract - The abstract type or file path.
     * @param $parameters - Arguments to pass to constructor/factory.
     * @returns The resolved instance.
     */
    make<T = any>($abstract: any, ...$parameters: any[]): T {
        return this.resolve<T>($abstract, $parameters, true);
    }

    /**
     * Execute a callback when the given key exists in the container.
     *
     * @param key - Property key to inspect.
     * @param done - Callback executed with the value if found.
     * @param error - Callback executed if key is undefined.
     * @returns void
     */
    whenHas(key: string, done: (val: any) => void = () => { }, error: () => void = () => { }): void {
        const val: any = this[key];
        if (typeof val !== 'undefined') {
            done(val);
        } else {
            error();
        }
    }

    /**
     * Resolve the given type from the container.
     *
     * @typeParam T - Resolved instance type.
     * @param $abstract - The abstract type, identifier or path.
     * @param $parameters - Parameters for resolution.
     * @param $make - Whether resolution was triggered via make().
     * @returns The resolved object or undefined.
     */
    resolve<T = any>($abstract: any, $parameters: any[] = [], $make: boolean = false): T {
        if (typeof $abstract === 'string') {
            if (this.$instances[$abstract]) {
                return this.$instances[$abstract];
            }
            const binding = this.$bindings[$abstract];

            if (binding) {
                const { callback, shared } = binding;
                $parameters = binding.parameters;
                const key: string = $abstract;

                $abstract = callback;
                if (shared && this.isBuildable($abstract)) {
                    if (IsClass($abstract)) {
                        $abstract = new $abstract(...$parameters);
                    } else {
                        $abstract = $abstract.apply(null, [...$parameters]);
                        if (IsClass($abstract)) {
                            $abstract.prototype.$app = this;
                            $abstract = new $abstract(...$parameters);
                        }
                    }
                    this.$instances[key] = $abstract;
                }
            } else {
                if ($make) {
                    $abstract = this.loadPath($abstract);
                }
            }
        }

        $abstract = this.build($abstract, $parameters);

        return (typeof $abstract === 'object' ? $abstract : undefined) as T;
    }

    /**
     * Require a file or module from a string path.
     *
     * @typeParam T - Required module type.
     * @param dir - Module identifier or relative/absolute path.
     * @returns Required module export or original value.
     */
    loadPath<T = any>(dir: unknown): T {
        return (typeof dir === 'string' ? require((dir.startsWith('./')) ? path.resolve(dir) : dir) : dir) as T;
    }

    /**
     * Determine if the given concrete is buildable.
     *
     * @param $concrete - Concrete definition to evaluate.
     * @returns True if buildable (function/class).
     */
    isBuildable($concrete: unknown): boolean {
        return typeof $concrete === 'function';
    }

    /**
     * Instantiate a concrete instance of the given type.
     *
     * @typeParam T - Constructed instance type.
     * @param $concrete - Concrete class or factory function.
     * @param $parameters - Constructor/factory arguments.
     * @returns Constructed instance or raw concrete.
     */
    build<T = any>($concrete: any, $parameters: any[] = []): T {
        if (this.isBuildable($concrete)) {
            if ($concrete.prototype && typeof $concrete.prototype.$app === 'undefined') {
                $concrete.prototype.$app = this;
            }
            if (IsClass($concrete)) {
                return new $concrete(...$parameters);
            } else {
                return $concrete.apply(null, $parameters);
            }
        } else {
            return $concrete;
        }
    }

    /**
     * Get the container's bindings.
     *
     * @returns Raw bindings dictionary.
     */
    getBindings(): Record<string, BindingDefinition> {
        return this.$bindings;
    }

    /**
     * Get the alias for an abstract if available.
     *
     * @param $abstract - Abstract name or alias.
     * @returns Canonical abstract identifier.
     */
    getAlias($abstract: string): string {
        return isset(this.$aliases[$abstract])
            ? this.getAlias(this.$aliases[$abstract])
            : $abstract;
    }

    /**
     * Register a binding with the container.
     *
     * @param key - Identifier or array of identifiers.
     * @param callback - Factory callback, class constructor, or path.
     * @param $parameters - Default parameters to pass on instantiation.
     * @param shared - Whether binding should be registered as a singleton.
     * @returns The registered callback.
     */
    bind(key: string | string[], callback?: any, $parameters: any[] = [], shared: boolean = false): any {
        if (typeof key === 'string' && !callback) {
            callback = require(key);
        }
        if (Array.isArray(key)) {
            key.map(k => {
                this.bind(k, this.loadPath(k), $parameters);
            });
        } else {
            if (this.isBuildable(callback)) {
                if (!IsClass(callback)) {
                    callback = callback.bind(null, this, ...$parameters);
                } else {
                    callback.prototype.$app = this;
                }
            } else if (typeof callback === 'string') {
                return this.bind(key, this.loadPath(callback), $parameters, shared);
            }
        }
        this.$bindings[key as string] = { callback, shared, parameters: $parameters };

        return callback;
    }

    /**
     * Determine if the given abstract type has been bound or instantiated.
     *
     * @param key - Abstract identifier.
     * @returns True if bound or instantiated.
     */
    bound(key: string): boolean {
        return Boolean(this.$bindings[key] || this.$instances[key]);
    }

    /**
     * Register a shared binding in the container.
     *
     * @param $abstract - Abstract identifier.
     * @param $concrete - Concrete class, factory, or file path.
     * @param $parameters - Additional parameters.
     * @returns The registered singleton definition.
     */
    singleton($abstract: string, $concrete?: any, ...$parameters: any[]): any {
        return this.bind($abstract, $concrete, $parameters, true);
    }

    /**
     * Get an existing singleton instance or register and return it.
     *
     * @typeParam T - Singleton instance type.
     * @param $abstract - Abstract identifier.
     * @param $concrete - Factory or constructor.
     * @returns Resolved singleton instance.
     */
    getOrCreateSingleton<T = any>($abstract: string, $concrete?: any): T {
        if (!this.$instances[$abstract] && typeof $concrete === 'function') {
            this.singleton($abstract, $concrete);
        }
        return this.$instances[$abstract] as T;
    }

    /**
     * Flush the container of all bindings and resolved instances.
     *
     * @returns void
     */
    flush(): void {
        this.$aliases = {};
        this.$resolved = {};
        this.$bindings = {};
        this.$instances = {};
        this.$scopedInstances = {};
    }

    /**
     * Drop a resolved instance from the cache.
     *
     * @param $abstract - Abstract identifier to drop.
     * @returns void
     */
    forgetInstance($abstract: string): void {
        delete this.$instances[$abstract];
    }

    /**
     * Clear all of the instances from the container.
     *
     * @returns void
     */
    forgetInstances(): void {
        this.$instances = {};
    }

    /**
     * Clear all scoped instances from the container.
     *
     * @returns void
     */
    forgetScopedInstances(): void {
        for (const $scoped in this.$scopedInstances) {
            delete this.$instances[$scoped];
        }
    }

    /**
     * Get the shared instance of the container.
     *
     * @returns Current or newly created container instance.
     */
    getInstance(): Application {
        if (is_null(this.$instance)) {
            this.$instance = new (this.constructor as any)();
        }
        return this.$instance!;
    }

    /**
     * Set the shared instance of the container.
     *
     * @param $container - Container instance or null to clear.
     * @returns The set instance.
     */
    setInstance($container: Application | null = null): Application | null {
        return this.$instance = $container;
    }

    /**
     * Get a property from the container or self if key is not passed.
     *
     * @typeParam T - Resolved property or container type.
     * @param key - Property or service name.
     * @returns The resolved property or container itself.
     */
    app<T = any>(key?: string): T {
        return (key ? this[key] : this) as T;
    }

    /**
     * Determine if current application environment matches given environment string(s).
     *
     * @param environment - Environment name or list of names (e.g. 'production', 'development').
     * @returns True if current environment matches.
     */
    environment(environment: string | string[]): boolean {
        const envs: string[] = Array.isArray(environment) ? environment : [environment];
        return envs.includes(process.env.NODE_ENV as string);
    }

    /**
     * Register an existing instance as shared in the container.
     *
     * @typeParam T - Registered instance type.
     * @param $abstract - Abstract identifier.
     * @param $instance - Concrete instance to store.
     * @returns The registered instance.
     */
    instance<T = any>($abstract: string, $instance: T): T {
        if ($instance) {
            this.$instances[$abstract] = $instance;
        }
        return this.$instances[$abstract] as T;
    }

    /**
     * Proxy getter to resolve services on attribute access.
     *
     * @param target - Container target.
     * @param key - Service or property name.
     * @returns Resolved service.
     */
    __get(target: Application, key: string): any {
        return target.resolve(key);
    }

    /**
     * Proxy setter to write attributes to container.
     *
     * @param target - Container target.
     * @param key - Property name.
     * @param value - Value to store.
     * @returns void
     */
    __set(target: Application, key: string, value: any): void {
        target[key] = value;
    }

}

export = Application;
