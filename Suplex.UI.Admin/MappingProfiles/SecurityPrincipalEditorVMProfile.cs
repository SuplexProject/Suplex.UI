using AutoMapper;
using Suplex.UI.Modules.Admin.ViewModels;
using Suplex.UI.Modules.Admin.Helpers;
using Suplex.Security.Principal;

namespace Suplex.UI.Modules.Admin.MappingProfiles
{
    public class SecurityPrincipalEditorVMProfile : Profile
    {
        public SecurityPrincipalEditorVMProfile()
        {
            CreateMap<User, SecurityPrincipalEditorVM>().ReverseMap();
            CreateMap<Group, SecurityPrincipalEditorVM>() 
                .ForMember(d => d.Mask, o => o.ResolveUsing(s => 
                    {
                        return MaskConverter.ByteArrayToString(s.Mask);
                        //string separator = ",";
                        //StringBuilder sb = new StringBuilder();
                        //foreach (byte b in s.Mask)
                        //{
                        //    sb.AppendFormat("{0}{1}", b, separator);
                        //}
                        //return sb.ToString().TrimEnd(separator.ToCharArray());
                    }));
            CreateMap<SecurityPrincipalEditorVM, Group>()
                .ForMember(d => d.Mask, o => o.ResolveUsing(s =>
                {
                    return MaskConverter.StringToByteArray(s.Mask);
                    //string[] stringArray = s.Mask.Split(',');

                    //byte[] mask = new byte[stringArray.Length];
                    //for (int i = 0; i < stringArray.Length; i++)
                    //{
                    //    mask[i] = Convert.ToByte(stringArray[i]);
                    //}
                    
                    //return mask;
                }));
        }

    }
}
