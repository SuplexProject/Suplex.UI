using AutoMapper;
using Suplex.Security.AclModel;
using Suplex.UI.Modules.Admin.ViewModels;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Suplex.UI.Modules.Admin.MappingProfiles
{
    public class SecureObjectTreeItemVMProfile : Profile
    {
        public SecureObjectTreeItemVMProfile()
        {
            CreateMap<ISecureObject, SecureObjectTreeItemVM>()
                .ForMember(d => d.HasChildren, opts => opts.MapFrom(s=> s.Children.Count > 0));
        }
    }
}
