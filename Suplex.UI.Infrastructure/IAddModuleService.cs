using Microsoft.Extensions.DependencyInjection;

namespace Suplex.UI.Infrastructure
{
    public interface IAddModuleService
    {
        int Priority { get; }
        void Execute(IServiceCollection serviceCollection);
    }
}
