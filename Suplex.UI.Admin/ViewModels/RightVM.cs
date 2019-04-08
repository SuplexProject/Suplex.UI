using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Suplex.UI.Modules.Admin.ViewModels
{
    //public class RightVM
    //{
    //    public string RightType { get; set; }
    //    public int RightId { get; set; }    // the value 
    //    public string RightName { get; set; }
    //}
    //public class RightTypeVM
    //{
    //    public string RightType { get; set; }
    //    public string RightTypeFriendlyName { get; set; }
    //}
    public class RightsVM
    {
        public string RightType { get; set; }   // short name
        public string RightTypeFriendlyName { get; set; }   
        public List<RightVM> Rights { get; set; }
    }
    public class RightVM
    {
        public int RightId { get; set; }    // the value 
        public string RightName { get; set; }
    }
    //public class RightTypeVM
    //{
    //    public string RightType { get; set; }
    //    //public string[] Rights { get; set; }
    //    public List<EnumVM> Rights { get; set; }
    //}
}
