using CefSharp;
using CefSharp.WinForms;
using Newtonsoft.Json;
using Synchronicity.Client.Model;
using System.IO;
using System.Reflection;
using System.Windows.Forms;
using exec = Synchronicity.Client.Executor;

namespace Synchronicity.Client.UI
{
    sealed class CefCustomObject
    {
        readonly ChromiumWebBrowser browser = null;
        readonly Form form = null;
        readonly string configurationFilePath = null;

        public CefCustomObject(ChromiumWebBrowser browser, Form form)
        {
            this.browser = browser;
            this.form = form;

            string directory = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
            configurationFilePath = Path.Combine(directory, "config.json");
        }

        public void ShowDevTools()
        {
            browser.ShowDevTools();
        }

        public void CallRdpClient(string callback)
        {
            var configuration = GetConfiguration();
            exec.Executor.Instance.Execute(configuration).ContinueWith((antecedent) =>
            {
                browser.GetMainFrame().ExecuteJavaScriptAsync(callback);
            });
        }

        public string GetServerUrl()
        {
            return GetConfiguration().ServerUrl;
        }

        public string GetUserName()
        {
            return GetConfiguration().UserName;
        }

        public void SetConfiguration(string serverUrl, string userName, string password)
        {
            SetConfiguration(new Configuration
            {
                ServerUrl = serverUrl,
                UserName = userName, 
                Password = password
            });
        }

        public Configuration GetConfiguration()
        {
            if (!File.Exists(configurationFilePath))
            {
                SetConfiguration(new Configuration());
            }

            return JsonConvert.DeserializeObject<Configuration>(File.ReadAllText(configurationFilePath));
        }

        void SetConfiguration(Configuration model)
        {
            JsonSerializer serializer = new JsonSerializer();
            using (StreamWriter sw = new StreamWriter(configurationFilePath))
            using (JsonWriter writer = new JsonTextWriter(sw))
            {
                serializer.Serialize(writer, model);
            }
        }

    }
}
