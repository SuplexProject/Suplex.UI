using AutoMapper;
using Suplex.UI.Modules.Admin.ViewModels;
using Suplex.Security.AclModel;
using System;
using System.Linq;
using Suplex.UI.Modules.Admin.Helpers;
using System.Collections.Generic;

namespace Suplex.UI.Modules.Admin.MappingProfiles
{
    public class SecureObjectEditorVMProfile : Profile
    {
        public SecureObjectEditorVMProfile()
        {

            CreateMap<IAccessControlEntry, DaclVM>()
                .ForMember(d => d.Right, opts => opts.MapFrom(s => s.RightData.Value))
                .ForMember(d => d.RightType, opts => opts.MapFrom(s => s.RightData.FriendlyTypeName));
            
            CreateMap<IAccessControlEntryAudit, SaclVM>()
                .ForMember(d => d.Right, opts => opts.MapFrom(s => s.RightData.Value))
                .ForMember(d => d.RightType, opts => opts.MapFrom(s => s.RightData.FriendlyTypeName));

            CreateMap<SecureObject, SecureObjectEditorVM>()
                .ForMember(d => d.DaclAllowInherit, opts => opts.MapFrom(s => s.Security.DaclAllowInherit))
                .ForMember(d => d.SaclAllowInherit, opts => opts.MapFrom(s => s.Security.SaclAllowInherit))
                .ForMember(d => d.SaclAuditTypeFilter, opts => opts.MapFrom(s => s.Security.SaclAuditTypeFilter))
                .ForMember(d => d.Dacl, opts => opts.MapFrom(s => Mapper.Map<DiscretionaryAcl, List<DaclVM>>(s.Security.Dacl)))
                .ForMember(d => d.Sacl, opts => opts.MapFrom(s => Mapper.Map<SystemAcl, List<SaclVM>>(s.Security.Sacl)))
                ;
            
            CreateMap(typeof(DaclVM), typeof(AccessControlEntry<>));
            CreateMap(typeof(SaclVM), typeof(AccessControlEntry<>));
            CreateMap<SecureObjectEditorVM, SecurityDescriptor>()
                .ForMember(d => d.Dacl, opt => opt.Ignore())
                .ForMember(d => d.Sacl, opt => opt.Ignore());
                
            CreateMap<SecureObjectEditorVM, SecureObject>()
                .ForMember(d => d.Children, opts => opts.MapFrom(s => new List<ISecureObject>()))
                .ForMember(d => d.Security, opts => opts.MapFrom(s => s));
            
        }
    }
}
