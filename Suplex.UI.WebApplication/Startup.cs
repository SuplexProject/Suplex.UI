using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json.Serialization;
using Suplex.UI.Infrastructure;
using AutoMapper;
using System.IO;
using System.Runtime.Loader;
using Microsoft.Extensions.DependencyModel;

namespace Suplex.UI.WebApplication
{
    public class Startup
    {
        //private string modulesPath;
        private List<Assembly> assemblies = new List<Assembly>();
        List<MenuItem> menuItems = new List<MenuItem>();
        private string defaultController;
        private string defaultAction;
        private ILogger logger;

        public Startup(IHostingEnvironment env, ILoggerFactory loggerFactory)
        {
            var builder = new ConfigurationBuilder()
                .SetBasePath(env.ContentRootPath)
                .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
                .AddJsonFile($"appsettings.{env.EnvironmentName}.json", optional: true)
                .AddEnvironmentVariables();
            Configuration = builder.Build();
            HostingEnvironment = env;
            logger = loggerFactory.CreateLogger<Startup>();
            IConfigurationSection configSection = Configuration.GetSection("DefaultRoute");
            defaultController = configSection.GetValue<string>("Controller");
            defaultAction = configSection.GetValue<string>("Action");
        }

        public IConfiguration Configuration { get; }
        public IHostingEnvironment HostingEnvironment { get; }

        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services)
        {
            this.logger.LogInformation("Running ConfigureServices...");

            LoadModulesFromConfig(assemblies, menuItems);

            // if for some reason we add a reference (for testing purposes) to the module project instead ModuleManager still need to be made aware of it
            // Get modules from Dependency Context
            if (HostingEnvironment.IsDevelopment())
                LoadModulesFromDependencyContext(assemblies);

            ModuleManager.SetAssemblies(assemblies.Where(a => a.FullName.ToUpper().Contains("MODULES.")));
            Menu.SetItems(menuItems);

            // Add framework services.
            var mvcBuilder = services
                                //.AddResponseCaching()       // required for responsecache attribute VaryByQueryKeys
                                .AddMvc()
                                // Maintain property names during serialization. See:
                                // https://github.com/aspnet/Announcements/issues/194
                                .AddJsonOptions(options =>
                                {
                                    options.SerializerSettings.ContractResolver = new DefaultContractResolver();
                                    options.SerializerSettings.Converters.Add(new Newtonsoft.Json.Converters.StringEnumConverter());
                                });

            foreach (var assembly in assemblies)
            {
                // Register controller from modules
                // Dependent assemblies need to be registered with applicationpart also so that they can be discovered by the razor view compilation at run time
                // Applicable when the view references these assemblies
                mvcBuilder.AddApplicationPart(assembly);
            }

            // register module level services
            foreach (IAddModuleService s in ModuleManager.GetInstances<IAddModuleService>().OrderBy(a => a.Priority))
            {
                s.Execute(services);
            }

            // create an EmbeddedFileProvider for the assemblies
            // and add them to the Razor view engine            
            mvcBuilder.AddRazorOptions(
                o =>
                {
                    //foreach (Assembly assembly in assemblies)
                    foreach (Assembly assembly in ModuleManager.Assemblies)
                    {
                        o.FileProviders.Add(new EmbeddedFileProvider(assembly, assembly.GetName().Name));
                    }
                }
            );

            services.AddSingleton<IConfiguration>(Configuration);

            // Add Kendo UI services to the services container
            services.AddKendo();

            // scans through code to find all configuration profiles, and registers the IMapper interface.
            services.AddAutoMapper();
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IHostingEnvironment env, ILoggerFactory loggerFactory)
        {
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();                
            }
            else
            {
                app.UseExceptionHandler("/Error/500");
            }

            app.UseStatusCodePagesWithReExecute("/Error/{0}");

            app.UseStaticFiles();

            // app.UseResponseCaching();

            foreach (Assembly assembly in ModuleManager.Assemblies)
            {
                app.UseStaticFiles(new StaticFileOptions()
                {
                    FileProvider = new EmbeddedFileProvider(assembly, assembly.GetName().Name) //,                    
                });
            }

            app.UseMvc(routes =>
            {
                routes.MapRoute(
                    name: "default",
                    template: "{controller}/{action}/{id?}",
                    defaults: new { controller = defaultController ?? "Home", action = defaultAction ?? "Index" });                
            });

            // Configure Kendo UI
            // only required for versions prior to R2 2018
            // app.UseKendo(env);  
        }

        private void LoadModulesFromConfig(List<Assembly> assemblies, List<MenuItem> menuItems)
        {
            ModulesSettings modulesSettings = new ModulesSettings();
            modulesSettings = Configuration.GetSection("Modules").Get<ModulesSettings>();
            string folderPath = null;

            if (string.IsNullOrEmpty(modulesSettings.RootPath))
            {
                this.logger.LogWarning("Loading assemblies from path skipped: root path not provided");
                return;
            }
            string modulesRootPath = HostingEnvironment.ContentRootPath + modulesSettings.RootPath;
            if (!Directory.Exists(modulesRootPath))
            {
                this.logger.LogWarning("Loading assemblies from path '{0}' skipped: root path not found", modulesRootPath);
                return;
            }
            if (modulesSettings.Include != null)
            {
                foreach (var f in modulesSettings.Include)
                {
                    // folder directory valid?
                    folderPath = $@"{modulesRootPath}\{f.FolderName}";
                    if (!Directory.Exists(folderPath))
                    {
                        this.logger.LogWarning("Loading assemblies from path '{0}' skipped: module folder path not found", folderPath);
                        return;
                    }
                    foreach (string m in Directory.EnumerateFiles(folderPath, "*.dll"))
                    {
                        // already loaded?
                        // cant find a way to get all loaded assemblies so only check the ones we manually load
                        Assembly assembly = assemblies.FirstOrDefault(a => a.FullName.Equals(AssemblyLoadContext.GetAssemblyName(m).FullName));
                        //Assembly assembly = null;
                        if (assembly == null)
                        {
                            try
                            {
                                assembly = AssemblyLoadContext.Default.LoadFromAssemblyPath(m);
                                this.logger.LogInformation($@"Loading assembly {m} successful");
                            }
                            catch (Exception e)
                            {
                                this.logger.LogError($@"Loading assembly {m} failed: {e.Message}");
                                throw;
                            }
                            if (assembly != null)
                            {
                                assemblies.Add(assembly);
                            }
                        }
                        else this.logger.LogWarning($@"Loading assembly {m} skipped: Assembly already loaded");

                    }
                    menuItems.Add(new MenuItem { Name = f.FriendlyName, Url = f.Url });
                }
            }

        }
        private void LoadModulesFromDependencyContext(List<Assembly> assemblies)
        {
            foreach (CompilationLibrary compilationLibrary in DependencyContext.Default.CompileLibraries)
            {
                //this.logger.LogInformation(compilationLibrary.Name);
                if (compilationLibrary.Name.ToUpper().Contains("MODULES."))
                {
                    Assembly assembly = AssemblyLoadContext.Default.LoadFromAssemblyName(new AssemblyName(compilationLibrary.Name));
                    if (!assemblies.Any(a => string.Equals(a.FullName, assembly.FullName, StringComparison.OrdinalIgnoreCase)))
                    {
                        assemblies.Add(assembly);
                        this.logger.LogInformation("Assembly '{0}' is discovered and loaded from dependency context", assembly.FullName);
                    }
                }

            }
        }
    }
}