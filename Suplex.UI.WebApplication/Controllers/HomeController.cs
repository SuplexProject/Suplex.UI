using Microsoft.AspNetCore.Mvc;

namespace Suplex.UI.WebApplication.Controllers
{
    public class HomeController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}