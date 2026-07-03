using System;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;

namespace LegitFlix.Plugin
{
    public class ZeroFlashStartupFilter : IStartupFilter
    {
        public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next)
        {
            return app =>
            {
                app.UseMiddleware<ZeroFlashMiddleware>();
                next(app);
            };
        }
    }
}
