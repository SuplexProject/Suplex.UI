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
            //CreateMap<SecureObject, SecureObjectEditorVM>();

            //CreateMap<SecurityDescriptor, SecurityVM>()
            //    .ForMember(d => d.SaclAuditTypeFilter, opts => opts.MapFrom(s => s.SaclAuditTypeFilter.ToStringArray()))  //.ToString().Split(new string[] { ", " }, StringSplitOptions.None)))
            //    ; //.ForSourceMember(s => s.Dacl, opts => opts.Ignore()); //.AfterMap((s, d) => Mapper.Map(s.Dacl, d)); ;
            
            CreateMap<IAccessControlEntry, DaclVM>()
                //.ForMember(d => d.Right, opts => opts.MapFrom(s => s.RightData.Name.Split(new string[] { ", " }, StringSplitOptions.None)))
                .ForMember(d => d.Right, opts => opts.MapFrom(s => s.RightData.Value))
                .ForMember(d => d.RightType, opts => opts.MapFrom(s => s.RightData.FriendlyTypeName));
            // not working - trying to do the normal way
            CreateMap<IAccessControlEntryAudit, SaclVM>()
                //.ForMember(d => d.Right, opts => opts.MapFrom(s => s.RightData.Name.Split(new string[] { ", " }, StringSplitOptions.None)))
                .ForMember(d => d.Right, opts => opts.MapFrom(s => s.RightData.Value))
                .ForMember(d => d.RightType, opts => opts.MapFrom(s => s.RightData.FriendlyTypeName));

            CreateMap<SecureObject, SecureObjectEditorVM>()
                .ForMember(d => d.DaclAllowInherit, opts => opts.MapFrom(s => s.Security.DaclAllowInherit))
                .ForMember(d => d.SaclAllowInherit, opts => opts.MapFrom(s => s.Security.SaclAllowInherit))
                //.ForMember(d => d.SaclAuditTypeFilter, opts => opts.MapFrom(s => s.Security.SaclAuditTypeFilter.ToStringArray()))
                .ForMember(d => d.SaclAuditTypeFilter, opts => opts.MapFrom(s => s.Security.SaclAuditTypeFilter))
                .ForMember(d => d.Dacl, opts => opts.MapFrom(s => Mapper.Map<DiscretionaryAcl, List<DaclVM>>(s.Security.Dacl)))
                .ForMember(d => d.Sacl, opts => opts.MapFrom(s => Mapper.Map<SystemAcl, List<SaclVM>>(s.Security.Sacl)))
                ;

            
        }
    }
}
