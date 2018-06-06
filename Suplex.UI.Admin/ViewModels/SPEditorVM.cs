using System;
using System.Collections.Generic;
using System.Linq;
using System.ComponentModel.DataAnnotations;

namespace Suplex.UI.Modules.Admin.ViewModels
{
    public class SPEditorVM
    {
        public Guid? UId { get; set; }

        [Required]
        public string Name { get; set; }

        public string Description { get; set; }

        public bool IsUser { get; set; }

        public bool IsBuiltIn { get; set; }

        public bool IsEnabled { get; set; }

        public bool IsLocal { get; set; }

        public string Mask { get; set; }

    }    
}
