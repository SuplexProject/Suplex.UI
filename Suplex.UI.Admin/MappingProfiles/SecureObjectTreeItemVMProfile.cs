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
                .ForMember(d => d.HasChildren, opts => opts.MapFrom(s => s.Children.Count > 0))
                .ForMember(d => d.IsDefaultSecuritySettings, opts => opts.Ignore())
                .AfterMap((s, d) => d.IsDefaultSecuritySettings = s.Security.DaclAllowInherit && s.Security.SaclAllowInherit && s.Security.SaclAuditTypeFilter == d.DefaultSaclAuditTypeFilter && s.Security.Dacl.Count == 0 && s.Security.Sacl.Count == 0);
                
        }
    }
}
