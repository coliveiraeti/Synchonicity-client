using CefSharp;
using CefSharp.WinForms;
using System.Windows.Forms;

namespace Synchronicity.Client.UI
{
    public partial class MainForm : Form
    {
        ChromiumWebBrowser browser;

        public MainForm()
        {
            InitializeComponent();
            InitializeChromium();
        }

        void InitializeChromium()
        {
            var settings = new CefSettings
            {
                CachePath = "cache"
            };
            Cef.Initialize(settings);
            string page = string.Format(@"{0}\html-resources\index.html", Application.StartupPath);
            browser = new ChromiumWebBrowser(page)
            {
                Dock = DockStyle.Fill
            };
            Controls.Add(browser);

            // Allow the use of local resources in the browser
            BrowserSettings browserSettings = new BrowserSettings
            {
                FileAccessFromFileUrls = CefState.Enabled,
                UniversalAccessFromFileUrls = CefState.Enabled
            };
            browser.BrowserSettings = browserSettings;

            browser.JavascriptObjectRepository.Register("cefCustomObject", new CefCustomObject(browser, this), true);

            // In case an initial debug is needed
            browser.IsBrowserInitializedChanged += ChromeBrowserIsBrowserInitializedChanged;
        }

        void MainForm_FormClosing(object sender, FormClosingEventArgs e)
        {
            Cef.Shutdown();
        }

        void ChromeBrowserIsBrowserInitializedChanged(object sender, IsBrowserInitializedChangedEventArgs e)
        {
            browser.ShowDevTools();
        }
    }
}
