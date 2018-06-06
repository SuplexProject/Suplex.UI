using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Suplex.UI.Modules.Admin.ViewModels
{
    public class FileSystemObjectVM
    {
        public string Path { get; set; }
        public string Name { get; set; }  
        public FileSystemObjectType Type { get; set; }
        public bool HasChildren { get; set; }        
    }
    [JsonConverter(typeof(StringEnumConverter))]
    public enum FileSystemObjectType
    {
        None,
        Drive,
        Folder,
        File
    }
}

