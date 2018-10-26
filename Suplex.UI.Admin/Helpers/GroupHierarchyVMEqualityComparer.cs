using System;
using System.Collections.Generic;
using System.Linq;
using Suplex.UI.Modules.Admin.ViewModels;

namespace Suplex.UI.Modules.Admin.Helpers
{
    public class GroupHierarchyVMEqualityComparer : IEqualityComparer<GroupHierarchyVM>
    {
        //https://docs.microsoft.com/en-us/dotnet/api/system.linq.enumerable.distinct?redirectedfrom=MSDN&view=netframework-4.7.2#System_Linq_Enumerable_Distinct__1_System_Collections_Generic_IEnumerable___0__System_Collections_Generic_IEqualityComparer___0__
        public bool Equals(GroupHierarchyVM x, GroupHierarchyVM y)
        {
            //Check whether the compared objects reference the same data.
            if (Object.ReferenceEquals(x, y)) return true;

            //Check whether any of the compared objects is null.
            if (x is null || y is null)
                return false;

            //Check whether the properties are equal.
            return (x.GroupUId == y.GroupUId || (x.GroupUId == null && y.GroupUId == null)) && x.MemberUId == y.MemberUId;
        }

        public int GetHashCode(GroupHierarchyVM obj)
        {
            //Check whether the object is null
            if (obj is null) return 0;

            //Get hash code for the GroupUId field if it is not null.
            int hashGroupUId = obj.GroupUId == null ? 0 : obj.GroupUId.GetHashCode();

            //Get hash code for the MemberUId field.
            int hashMemberUId = obj.MemberUId.GetHashCode();

            //Calculate the hash code for the object.
            return hashMemberUId ^ hashGroupUId;

        }
    }
}
