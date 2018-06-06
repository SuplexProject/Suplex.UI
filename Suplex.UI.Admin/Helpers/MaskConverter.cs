using System;
using System.Collections;
using System.Text;

namespace Suplex.UI.Modules.Admin.Helpers
{
    public static class MaskConverter
    {
        public static string ByteArrayToString(Byte[] bytes, char separator = ',')
        {
            if (bytes == null) return null;

            //string separator = ",";
            StringBuilder sb = new StringBuilder();
            foreach (byte b in bytes)
            {
                sb.AppendFormat("{0}{1}", b, separator);
            }
            return sb.ToString().TrimEnd(separator.ToString().ToCharArray());
        }
        public static byte[] StringToByteArray(string value, char separator = ',')
        {
            if (value == null) return null;

            string[] stringArray = value.Split(',');

            byte[] bytes = new byte[stringArray.Length];
            for (int i = 0; i < stringArray.Length; i++)
            {
                bytes[i] = Convert.ToByte(stringArray[i]);
            }

            return bytes;
        }
        public static string BitArrayToString(BitArray value, char separator = ',')
        {
            byte[] maskByteArray = new byte[(int)Math.Ceiling((double)value.Length / 8)];
            value.CopyTo(maskByteArray, 0);
            return ByteArrayToString(maskByteArray, separator);
        }
    }
}
