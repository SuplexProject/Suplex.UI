using System;
using System.Collections.Generic;
using System.Linq;
using Suplex.UI.Modules.Admin.ViewModels;

namespace Suplex.UI.Modules.Admin.Helpers
{
    public static class EnumHelpers
    {
        //public static List<EnumVM> EnumToList<T>()
        public static List<EnumVM> ToList(Type enumType)
        {
            List<EnumVM> enumList = new List<EnumVM>();

            //Type enumType = typeof(T);
            if (!enumType.IsEnum)
                return enumList;
            foreach (int v in Enum.GetValues(enumType))
            {
                enumList.Add(new EnumVM { Id = v, Name = Enum.Parse(enumType, v.ToString()).ToString() });
            }

            return enumList;
        }
        public static Dictionary<string, int> ToDict(Type enumType)
        {
            Dictionary<string, int> dict = new Dictionary<string, int>();

            if (!enumType.IsEnum)
                return null;
            foreach (int v in Enum.GetValues(enumType))
            {
                string key = Enum.Parse(enumType, v.ToString()).ToString();
                if (!dict.ContainsKey(key))
                    dict.Add(key, v);
            }
            return dict;
        }
                   
        public static string[] ToStringArray(this Enum enumValue)
        {
            return enumValue.ToString().Split(new string[] { ", " }, StringSplitOptions.None);
        }
    }
}
