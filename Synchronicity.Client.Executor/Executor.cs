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

        public Task Execute(Configuration configuration)
        {
            return Task.Run(() =>
            {
                var pi = new ProcessStartInfo
                {
                    UseShellExecute = true,
                    CreateNoWindow = false,
                    FileName = "cmd.exe",
                    Arguments = "/c pause"
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
