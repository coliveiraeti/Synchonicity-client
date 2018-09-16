using Synchronicity.Client.Model;
using System;
using System.Diagnostics;
using System.Threading.Tasks;

namespace Synchronicity.Client.Executor
{
    public sealed class Executor
    {
        private static readonly Lazy<Executor> lazy = new Lazy<Executor>(() => new Executor());

        public static Executor Instance { get { return lazy.Value; } }

        public Task Execute(string title, string parameters, string username, string password, Configuration configuration)
        {
            parameters = parameters.Replace("{username}", "{0}").Replace("{password}", "{1}").Replace("{title}","{2}");
            parameters = string.Format(parameters, username, password, title);

            return Task.Run(() =>
            {
                var pi = new ProcessStartInfo
                {
                    UseShellExecute = true,
                    CreateNoWindow = false,
                    FileName = configuration.WFreeRdpPath,
                    Arguments = parameters
                };
                using (var p = Process.Start(pi))
                {
                    p.WaitForExit();
                }
            });
        }

        Executor()
        {
        }

    }
}
