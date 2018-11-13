using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace Suplex.UI.Modules.Admin.ViewModels
{
    public class GroupHierarchyVM
    {
        [JsonIgnore]
        public Guid MemberUId { get; set; }
        [JsonIgnore]
        public Guid? GroupUId { get; set; }
        public int Id { get; set; }         // This ID will be unique - it has to be  unique for the treelist to work
        public int? ParentId { get; set; }   // works hand in hand with Id
        public string Name { get; set; }
        public string Description { get; set; }
        public bool IsUser { get; set; }
        public bool IsLocal { get; set; }
        public bool IsEnabled { get; set; }
    }
    
}
