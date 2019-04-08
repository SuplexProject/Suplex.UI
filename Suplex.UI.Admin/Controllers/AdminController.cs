using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading.Tasks;
using Kendo.Mvc.Extensions;
using Kendo.Mvc.UI;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging;
using System.IO;
using Microsoft.AspNetCore.Hosting;
using Suplex.UI.Modules.Admin.ViewModels;
using Suplex.Security.Principal;
using AutoMapper;
using System.Collections;
using Suplex.UI.Modules.Admin.Helpers;
using Microsoft.Extensions.Configuration;
using Suplex.Security.AclModel;
using Suplex.Security.WebApi;

namespace Suplex.UI.Modules.Admin.Controllers
{
    public class Admin : Controller
    {
        private IConfiguration _configuration;
        private readonly ILogger<Admin> _logger;
        private readonly IHostingEnvironment _hostingEnvironment;
        private readonly IMapper _mapper;
        private int _maskSize;
        private readonly string _apiUrl;
        private SuplexSecurityHttpApiClient _svc;

        //private static List<RightVM> _rights = null;
        private static List<RightsVM> _rights = null;
        private static Dictionary<string, string> _rightTypeLookup = null;
        private static List<EnumVM> _auditTypes = null;
        private static Dictionary<string, Object> _secureObjectDefaults = null;
        const string SUCCESS = "success";
        const string ERROR = "error";
        public Admin(IConfiguration configuration, ILogger<Admin> logger, IHostingEnvironment hostingEnvironment, IMapper mapper)
        {
            _configuration = configuration;
            //_maskSize = int.Parse(_configuration["MaskSize"]);
            int.TryParse( _configuration["MaskSize"], out _maskSize );

            _logger = logger;
            _hostingEnvironment = hostingEnvironment;
            _mapper = mapper;

            _auditTypes = _auditTypes ?? EnumHelpers.ToList( typeof( AuditType ) );

            _rights = _rights ?? SetupRightsValues();

            _rightTypeLookup = _rightTypeLookup ?? SetupRightTypeLookup();

            _secureObjectDefaults = _secureObjectDefaults ?? SetupSecureObjectDefaults();

            _apiUrl = _configuration["SuplexWebApiURL"];
            _svc = new SuplexSecurityHttpApiClient( _apiUrl );

        }

        public IActionResult Index()
        {
            _logger.LogInformation( "index" );
            Console.WriteLine( _hostingEnvironment.ContentRootPath );

            return View();

        }

        #region master data
        public Dictionary<string, Object> SetupSecureObjectDefaults()
        {
            Dictionary<string, Object> defaultValues = new Dictionary<string, Object>();

            SecureObject so = new SecureObject();
            defaultValues.Add( "IsEnabled", so.IsEnabled );
            defaultValues.Add( "DaclAllowInherit", so.Security.DaclAllowInherit );
            defaultValues.Add( "SaclAllowInherit", so.Security.SaclAllowInherit );
            int defAuditTypeFilter = (int)so.Security.SaclAuditTypeFilter;
            defaultValues.Add( "SaclAuditTypeFilter", defAuditTypeFilter ); //.ToStringArray());
            int[] defAuditTypeFilterArray = Enum.GetValues( typeof( AuditType ) ).Cast<int>().Where( i => (i & defAuditTypeFilter) == i ).ToArray();
            defaultValues.Add( "SaclAuditTypeFilterArray", defAuditTypeFilterArray );
            AccessControlEntry<FileSystemRight> dacl = new AccessControlEntry<FileSystemRight>();
            defaultValues.Add( "DaclAllowed", dacl.Allowed );
            defaultValues.Add( "DaclInheritable", dacl.Inheritable );
            AccessControlEntryAudit<FileSystemRight> sacl = new AccessControlEntryAudit<FileSystemRight>();
            defaultValues.Add( "SaclAllowed", sacl.Allowed );
            defaultValues.Add( "SaclInheritable", sacl.Inheritable );
            defaultValues.Add( "SaclDenied", sacl.Denied );

            return defaultValues;
        }
        //public List<RightVM> SetupRightsValues()
        public List<RightsVM> SetupRightsValues()
        {
            List<Type> types = EnumUtilities.GetRightTypes();
            //List<Type> types = new List<Type>() { typeof( UIRight ), typeof( RecordRight ), typeof( FileSystemRight ), typeof( SynchronizationRight ) };
            //List<RightVM> rights = new List<RightVM>();
            //List<RightTypeVM> rightTypes = new List<RightTypeVM>();
            //foreach( Type t in types )
            //{
            //    rights.AddRange( EnumHelpers.ToList( t ).Select( s => new RightVM { RightType = t.Name, RightId = s.Id, RightName = s.Name } ).OrderBy( o => o.RightType ).ThenByDescending( o => o.RightId ).ToList() );
            //    rightTypes.Add( new RightTypeVM { RightType = t.Name, RightTypeFriendlyName = t.GetFriendlyRightTypeName() } );
            //}
            List<RightsVM> rights = new List<RightsVM>();
            foreach( Type t in types )
            {
                rights.Add( new RightsVM
                {
                    RightType = t.Name,
                    RightTypeFriendlyName = t.GetFriendlyRightTypeName(),
                    Rights = EnumHelpers.ToList( t ).Select( s => new RightVM { RightId = s.Id, RightName = s.Name } ).OrderByDescending( o => o.RightId ).ToList()
                } );

            }
            _logger.LogInformation( $"In SetupRightsValues" );
            return rights;
        }
        public Dictionary<string, string> SetupRightTypeLookup()
        {
            List<Type> types = EnumUtilities.GetRightTypes();
            Dictionary<string, string> lookup = new Dictionary<string, string>();
            foreach( Type t in types)
            {
                lookup.Add( t.Name, t.AssemblyQualifiedName );   
            }
            return lookup;
        }
        public IActionResult GetRights()
        {
            return Json( _rights );
        }
        public IActionResult GetAuditTypes()
        {
            return Json( _auditTypes );
        }
        public IActionResult GetSecureObjectDefaults()
        {
            return Json( _secureObjectDefaults );
        }
        #endregion

        public async Task<IActionResult> IsConnected()
        {
            bool isConnected = false;
            try
            {
                List<User> users = await _svc.GetUserByNameAsync( null, false );
                isConnected = true;
            }
            catch( Exception ex )
            {
                _logger.LogError( ex, "Not able to connect to remote service" );
            }
            return Json( new ResponseVM { Status = isConnected ? SUCCESS : ERROR } );

        }
        //private List<SecureObject> SortSecureObjects(IList<SecureObject> secureObjects)
        //{
        //    List<SecureObject> sortedList = secureObjects.ToList();
        //    sortedList.Sort((x, y) => x.UniqueName.CompareTo(y.UniqueName));

        //    foreach (SecureObject item in sortedList)
        //    {
        //        SortSecureObjects(item.Children);
        //    }
        //    return sortedList;
        //}

        #region Security Principals
        public async Task<IActionResult> GetSecurityPrincipals([DataSourceRequest] DataSourceRequest request)
        {
            List<SecurityPrincipalGridVM> sp = null;
            try
            {
                Task<List<User>> taskGetUsers = _svc.GetUserByNameAsync( null, false );
                Task<List<Group>> taskGetGroups = _svc.GetGroupByNameAsync( null, false );

                List<User> users = await taskGetUsers;
                List<Group> groups = await taskGetGroups;

                sp = _mapper.Map<IList<User>, List<SecurityPrincipalGridVM>>( users );
                sp.AddRange( _mapper.Map<IList<Group>, List<SecurityPrincipalGridVM>>( groups ) );

            }
            catch( Exception ex )
            {
                ModelState.AddModelError( string.Empty, ex.Message );
                _logger.LogError( ex, "Error getting security principals" );
            }

            if( sp == null )
            {
                sp = new List<SecurityPrincipalGridVM>();
            }
            return Json( sp.ToDataSourceResult( request, ModelState ) );
        }

        public async Task<IActionResult> GetUserByUId(Guid uId)
        {
            _logger.LogInformation( $"In GetUserByUId({nameof( uId )}:{uId})" );

            ResponseVM r = null;
            try
            {
                // Get user and get member of
                Task<User> taskGetUser = _svc.GetUserByUIdAsync( uId );
                Task<MembershipList<Group>> taskGetMemberOf = _svc.GetGroupMemberOfListAsync( uId, false, true );
                await Task.WhenAll( taskGetUser, taskGetMemberOf );
                User u = taskGetUser.Result;
                SecurityPrincipalEditorVM sp = _mapper.Map<User, SecurityPrincipalEditorVM>( u );
                MembershipList<Group> memberOfList = taskGetMemberOf.Result;
                List<MemberVM> memberOfDest = _mapper.Map<List<Group>, List<MemberVM>>( memberOfList.MemberList );
                List<MemberVM> notMemberOfDest = _mapper.Map<List<Group>, List<MemberVM>>( memberOfList.NonMemberList );

                r = new ResponseVM()
                {
                    Status = SUCCESS,
                    Data = new UserVM { User = sp, MemberOf = memberOfDest, NotMemberOf = notMemberOfDest }
                };
            }

            catch( Exception ex )
            {
                _logger.LogError( ex, $"Error retrieving information for user {uId}" );
                r = new ResponseVM()
                {
                    Status = ERROR,
                    Message = $"There is a problem retrieving information for user {uId}"
                };
            }
            return Json( r );
        }

        public async Task<IActionResult> GetNewUser()
        {
            _logger.LogInformation( $"In GetNewUser()" );

            SecurityPrincipalEditorVM sp = null;
            ResponseVM r = null;

            try
            {
                User u = new User();
                sp = _mapper.Map<User, SecurityPrincipalEditorVM>( u );
                sp.UId = null;

                List<Group> groups = await _svc.GetGroupByNameAsync( null, false );
                List<MemberVM> notMemberOf = _mapper.Map<IEnumerable<Group>, List<MemberVM>>( groups.Where( g => g.IsLocal ) );

                r = new ResponseVM()
                {
                    Status = SUCCESS,
                    Data = new UserVM { User = sp, MemberOf = new List<MemberVM>(), NotMemberOf = notMemberOf }
                };
            }
            catch( Exception ex )
            {
                _logger.LogError( ex, $"Error retrieving information for new user" );
                r = new ResponseVM()
                {
                    Status = ERROR,
                    Message = $"There is a problem retrieving information for new user"
                };
            }
            return Json( r );
        }
        [HttpPost]
        public async Task<IActionResult> SaveUser([FromBody] UserSaveVM userSave)
        {
            bool ok = false;
            _logger.LogInformation( $"In SaveUser({nameof( userSave )}:{userSave})" );

            SecurityPrincipalEditorVM sp = userSave.User;
            List<MemberVM> memberOfToAdd = userSave.MemberOfToAdd;
            List<MemberVM> memberOfToRemove = userSave.MemberOfToRemove;

            MembershipList<Group> memberOfList = null;
            List<MemberVM> memberOfDest = null;
            List<MemberVM> notMemberOfDest = null;
            try
            {
                // validate name: must be unique
                Task<List<User>> getUsers = _svc.GetUserByNameAsync( sp.Name, true );
                Task<List<Group>> getGroups = _svc.GetGroupByNameAsync( sp.Name, true );

                List<User> users = await getUsers;
                List<Group> groups = await getGroups;

                // if new user
                if( sp.UId == null )
                {

                    if( users.Count != 0 || groups.Count != 0 )
                    {
                        ModelState.AddModelError( "Name", "Name has already been used. Please choose another one." );
                    }
                }
                else
                {
                    if( users.Where( x => x.UId != sp.UId ).Count() != 0 ||
                        groups.Count != 0 )
                    {
                        ModelState.AddModelError( "Name", "Name has already been used. Please choose another one." );
                    }
                }

                if( ModelState.IsValid )
                {
                    User u;
                    // if new user
                    if( sp.UId == null )
                    {

                        u = new User();
                        sp.UId = u.UId;
                    }
                    else
                    {
                        u = await _svc.GetUserByUIdAsync( sp.UId.Value );
                    }

                    _mapper.Map<SecurityPrincipalEditorVM, User>( sp, u );    // map to existing object so we dont override fields that are not used in the UI
                    await _svc.UpsertUserAsync( u );

                    List<GroupMembershipItem> gmiToRemove = new List<GroupMembershipItem>();
                    foreach( MemberVM i in memberOfToRemove )
                    {
                        //await _svc.DeleteGroupMembershipAsync(new GroupMembershipItem { GroupUId = i.UId, MemberUId = u.UId, IsMemberUser = u.IsUser });
                        //deleteGroupMembership.Add(_svc.DeleteGroupMembershipAsync(new GroupMembershipItem { GroupUId = i.UId, MemberUId = u.UId, IsMemberUser = u.IsUser }));
                        gmiToRemove.Add( new GroupMembershipItem { GroupUId = i.UId, MemberUId = u.UId, IsMemberUser = u.IsUser } );
                    }
                    await _svc.DeleteGroupMembershipAsync( gmiToRemove );
                    List<GroupMembershipItem> gmiToAdd = new List<GroupMembershipItem>();
                    foreach( MemberVM i in memberOfToAdd )
                    {
                        gmiToAdd.Add( new GroupMembershipItem { GroupUId = i.UId, MemberUId = u.UId, IsMemberUser = u.IsUser } );
                    }
                    await _svc.UpsertGroupMembershipAsync( gmiToAdd );

                    sp = _mapper.Map<User, SecurityPrincipalEditorVM>( u );   // get a fresh record to return to the client

                    memberOfList = await _svc.GetGroupMemberOfListAsync( u, true );
                    memberOfDest = _mapper.Map<List<Group>, List<MemberVM>>( memberOfList.MemberList );
                    notMemberOfDest = _mapper.Map<List<Group>, List<MemberVM>>( memberOfList.NonMemberList );

                    ok = true;
                }
                else
                {
                    _logger.LogError( $"Error saving user {sp.UId} | {sp.Name}" );
                }
            }
            catch( Exception ex )
            {
                ModelState.AddModelError( string.Empty, ex.Message );
                _logger.LogError( ex, $"Error saving user {sp.UId} | {sp.Name}" );
            }

            ResponseVM r = new ResponseVM()
            {
                Status = ok ? SUCCESS : ERROR,
                Message = ok ? null : "Unable to save User due to errors.",
                ValidationErrors = ok ? null : ModelState.Keys.SelectMany( k => ModelState[k].Errors )
                              .Select( m => m.ErrorMessage ).ToList(),
                Data = ok ? new UserVM { User = sp, MemberOf = memberOfDest, NotMemberOf = notMemberOfDest } : null
            };

            //https://www.telerik.com/blogs/handling-server-side-validation-errors-in-your-kendo-ui-grid
            //https://techbrij.com/modelstate-errors-angularjs-asp-net-mvc
            //https://www.jerriepelser.com/blog/validation-response-aspnet-core-webapi/
            return Json( r );
        }
        //[HttpPost]
        public async Task<IActionResult> DeleteUser(Guid uId)
        {
            string error = null;
            User u = null;
            _logger.LogInformation( $"In DeleteUser({nameof( uId )}:{uId})" );

            ResponseVM r = null;
            try
            {
                u = await _svc.GetUserByUIdAsync( uId );
                if( u.IsBuiltIn )
                {
                    error = $"User {u.Name} cannot be deleted as it is a built-in user.";
                }
                else
                {
                    await _svc.DeleteUserAsync( uId );
                }
            }
            catch( Exception ex )
            {
                _logger.LogError( ex, $"Error deleting User {uId}" );
                error = $"An error has occurred while deleting User {u.Name}.";
            }
            r = new ResponseVM()
            {
                Status = string.IsNullOrEmpty( error ) ? SUCCESS : ERROR,
                Message = error
            };
            return Json( r );
        }
        public async Task<IActionResult> GetGroupByUId(Guid uId)
        {

            _logger.LogInformation( $"In GetGroupByUId({nameof( uId )}:{uId})" );

            SecurityPrincipalEditorVM sp = null;
            ResponseVM r = null;
            try
            {
                Task<Group> getGroup = _svc.GetGroupByUIdAsync( uId );
                Task<MembershipList<SecurityPrincipalBase>> getMembersList = _svc.GetGroupMembersListAsync( uId, true );
                Task<MembershipList<Group>> getMemberOfList = _svc.GetGroupMemberOfListAsync( uId, true );
                Task<IEnumerable<GroupMembershipItem>> getGroupMemberhipHierarchy = _svc.GetGroupMembershipHierarchyAsync( uId, true );

                Group g = await getGroup;
                MembershipList<SecurityPrincipalBase> membersList = await getMembersList;
                MembershipList<Group> memberOfList = await getMemberOfList;
                List<GroupMembershipItem> groupMembershipHierarchy = (List<GroupMembershipItem>)await getGroupMemberhipHierarchy;

                sp = _mapper.Map<Group, SecurityPrincipalEditorVM>( g );
                List<MemberVM> membersDest = _mapper.Map<List<SecurityPrincipalBase>, List<MemberVM>>( membersList.MemberList );
                List<MemberVM> notMembersDest = _mapper.Map<List<SecurityPrincipalBase>, List<MemberVM>>( membersList.NonMemberList );

                List<MemberVM> memberOfDest = _mapper.Map<List<Group>, List<MemberVM>>( memberOfList.MemberList );
                List<MemberVM> notMemberOfDest = _mapper.Map<List<Group>, List<MemberVM>>( memberOfList.NonMemberList );

                // Build the group hierarchy data for the treelist
                // 1. get root nodes
                //List<GroupMembershipItem> rootnodes = groupMembershipHierarchy.Where( i => (groupMembershipHierarchy.Count( x => x.MemberUId == i.GroupUId ) == 0) )
                //    .Select( i => new GroupMembershipItem { GroupUId = i.GroupUId, MemberUId = i.GroupUId, Group = i.Group, Member = i.Group } )
                //    .Distinct( new Suplex.UI.Modules.Admin.Helpers.GroupMembershipEqualityComparerTest() )
                //    .ToList();
                List<GroupMembershipItem> rootnodes = new List<GroupMembershipItem>();
                foreach( GroupMembershipItem gmi in groupMembershipHierarchy )
                {
                    if( rootnodes.Find( x => x.GroupUId == gmi.GroupUId ) == null )
                    {
                        if( groupMembershipHierarchy.Find( h => h.MemberUId == gmi.GroupUId ) == null )
                            rootnodes.Add( new GroupMembershipItem { GroupUId = gmi.GroupUId, MemberUId = gmi.GroupUId, Group = gmi.Group, Member = gmi.Member } );
                    }
                }

                List<GroupHierarchyVM> gh = new List<GroupHierarchyVM>();

                // 2. recursively get children
                int id = 0;
                foreach( GroupMembershipItem node in rootnodes )
                {
                    gh.Add( new GroupHierarchyVM { Id = ++id, ParentId = null, MemberUId = node.GroupUId, GroupUId = null, Name = node.Group.Name, Description = node.Group.Description, IsEnabled = node.Group.IsEnabled, IsLocal = node.Group.IsLocal, IsUser = node.Group.IsUser } );
                    gh.AddRange( recurseGetGroupHierarchyChildren( node, groupMembershipHierarchy, ref id, id ) );
                }
                //List<GroupHierarchyVM> gh = _mapper.Map<IEnumerable<GroupMembershipItem>, List<GroupHierarchyVM>>(groupMembershipHierarchy);
                //List<GroupHierarchyVM> ghRootNodes = groupMembershipHierarchy.Where(i => (groupMembershipHierarchy.Count(x => x.MemberUId == i.GroupUId) == 0))
                //    .Select(i => new GroupHierarchyVM { GroupUId = null, MemberUId = i.GroupUId, Name = i.Group.Name, Description = i.Group.Description, IsEnabled = i.Group.IsEnabled, IsLocal = i.Group.IsLocal, IsUser = i.Group.IsUser })
                //    .Distinct(new GroupHierarchyVMEqualityComparer())
                //    .ToList();
                //gh.AddRange(ghRootNodes);

                r = new ResponseVM()
                {
                    Status = SUCCESS,
                    Data = new GroupVM { Group = sp, MemberOf = memberOfDest, Members = membersDest, GroupHierarchy = gh, NotMemberOf = notMemberOfDest, NotMembers = notMembersDest }
                };
            }

            catch( Exception ex )
            {
                _logger.LogError( ex, $"Error retrieving information for Group {uId}" );
                r = new ResponseVM()
                {
                    Status = ERROR,
                    Message = $"There is a problem retrieving information for Group {uId}"
                };
            }
            return Json( r );
        }

        private IEnumerable<GroupHierarchyVM> recurseGetGroupHierarchyChildren(GroupMembershipItem parent, IEnumerable<GroupMembershipItem> groupMembershipHierarchy, ref int id, int parentId)
        {
            List<GroupHierarchyVM> hierarchy = new List<GroupHierarchyVM>();
            IEnumerable<GroupMembershipItem> children = groupMembershipHierarchy.Where( x => x.GroupUId == parent.MemberUId );
            foreach( GroupMembershipItem child in children )
            {
                hierarchy.Add( new GroupHierarchyVM { Id = ++id, ParentId = parentId, GroupUId = child.GroupUId, MemberUId = child.MemberUId, Name = child.Member.Name, Description = child.Member.Description, IsEnabled = child.Member.IsEnabled, IsLocal = child.Member.IsLocal, IsUser = child.Member.IsUser } );
                hierarchy.AddRange( recurseGetGroupHierarchyChildren( child, groupMembershipHierarchy, ref id, id ) );
            }
            return hierarchy;
        }
        public async Task<IActionResult> GetNewGroup()
        {
            _logger.LogInformation( $"In GetNewGroup()" );

            SecurityPrincipalEditorVM sp = null;
            ResponseVM r = null;
            try
            {
                Group g = new Group();
                sp = _mapper.Map<Group, SecurityPrincipalEditorVM>( g );
                sp.UId = null;


                Task<List<Group>> getGroups = _svc.GetGroupByNameAsync( null, false );
                Task<List<User>> getUsers = _svc.GetUserByNameAsync( null, false );

                List<Group> groups = await getGroups;
                List<User> users = await getUsers;

                // not member of = all local group
                List<MemberVM> notMemberOf = _mapper.Map<IEnumerable<Group>, List<MemberVM>>( groups.Where( x => x.IsLocal ) );
                // not members = all security principals
                List<MemberVM> notMembers = _mapper.Map<IEnumerable<Group>, List<MemberVM>>( groups );
                notMembers.AddRange( _mapper.Map<IEnumerable<User>, List<MemberVM>>( users ) );

                r = new ResponseVM()
                {
                    Status = SUCCESS,
                    Data = new GroupVM { Group = sp, MemberOf = new List<MemberVM>(), Members = new List<MemberVM>(), GroupHierarchy = new List<GroupHierarchyVM>(), NotMemberOf = notMemberOf, NotMembers = notMembers }
                };
            }
            catch( Exception ex )
            {
                _logger.LogError( ex, $"Error retrieving information for new group" );
                r = new ResponseVM()
                {
                    Status = ERROR,
                    Message = $"There is a problem retrieving information for new group"
                };
            }
            return Json( r );
        }
        [HttpPost]
        public async Task<IActionResult> SaveGroup([FromBody] GroupSaveVM groupSave)
        {
            bool ok = false;
            _logger.LogInformation( $"In SaveGroup({nameof( groupSave )}:{groupSave})" );
            SecurityPrincipalEditorVM sp = groupSave.Group;
            List<MemberVM> membersToAdd = groupSave.MembersToAdd;
            List<MemberVM> membersToRemove = groupSave.MembersToRemove;
            List<MemberVM> memberOfToAdd = groupSave.MemberOfToAdd;
            List<MemberVM> memberOfToRemove = groupSave.MemberOfToRemove;

            MembershipList<SecurityPrincipalBase> membersList = null;
            List<MemberVM> membersDest = null;
            List<MemberVM> notMembersDest = null;
            MembershipList<Group> memberOfList = null;
            List<MemberVM> memberOfDest = null;
            List<MemberVM> notMemberOfDest = null;
            List<GroupHierarchyVM> gh = null;
            try
            {
                // validate name: must be unique
                Task<List<Group>> getGroups = _svc.GetGroupByNameAsync( sp.Name, true );
                Task<List<User>> getUsers = _svc.GetUserByNameAsync( sp.Name, true );
                List<Group> groups = await getGroups;
                List<User> users = await getUsers;
                // if new user
                if( sp.UId == null )
                {
                    if( groups.Count != 0 || users.Count != 0 )
                    {
                        ModelState.AddModelError( "Name", "Name has already been used. Please choose another one." );
                    }
                }
                else
                {
                    if( groups.Where( x => x.UId != sp.UId ).Count() != 0 ||
                        users.Count != 0 )
                    {
                        ModelState.AddModelError( "Name", "Name has already been used. Please choose another one." );
                    }
                }

                if( ModelState.IsValid )
                {
                    Group g;

                    // if new user
                    if( sp.UId == null )
                    {

                        g = new Group();
                        sp.UId = g.UId;
                        if( _maskSize == 0 )
                        {
                            sp.Mask = "0";
                        }
                        else
                        {
                            //BitArray maskBitArray = _svc.Store.Groups.GetNextMask( _maskSize );
                            //sp.Mask = MaskConverter.BitArrayToString( maskBitArray );
                            sp.Mask = "0";
                        }
                    }
                    else
                    {
                        g = await _svc.GetGroupByUIdAsync( sp.UId.Value );
                    }

                    _mapper.Map<SecurityPrincipalEditorVM, Group>( sp, g );   // map to existing object so we dont override fields that are not used in the UI
                    await _svc.UpsertGroupAsync( g );

                    // work on group membership
                    List<GroupMembershipItem> gmiToRemove = new List<GroupMembershipItem>();
                    foreach( MemberVM i in memberOfToRemove )
                    {
                        gmiToRemove.Add( new GroupMembershipItem { GroupUId = i.UId, MemberUId = g.UId, IsMemberUser = g.IsUser } );
                    }
                    foreach( MemberVM i in membersToRemove )
                    {
                        gmiToRemove.Add( new GroupMembershipItem { GroupUId = g.UId, MemberUId = i.UId, IsMemberUser = i.IsUser } );
                    }
                    await _svc.DeleteGroupMembershipAsync( gmiToRemove );
                    List<GroupMembershipItem> gmiToAdd = new List<GroupMembershipItem>();
                    foreach( MemberVM i in memberOfToAdd )
                    {
                        gmiToAdd.Add( new GroupMembershipItem { GroupUId = i.UId, MemberUId = g.UId, IsMemberUser = g.IsUser } );
                    }
                    foreach( MemberVM i in membersToAdd )
                    {
                        gmiToAdd.Add( new GroupMembershipItem { GroupUId = g.UId, MemberUId = i.UId, IsMemberUser = i.IsUser } );
                    }
                    await _svc.UpsertGroupMembershipAsync( gmiToAdd );

                    // get a fresh data to send to the browser (same code as GetGroupByUId()
                    sp = _mapper.Map<Group, SecurityPrincipalEditorVM>( g );   // get a fresh record to return to the client

                    Task<MembershipList<SecurityPrincipalBase>> getMembersList = _svc.GetGroupMembersListAsync( g, true );
                    Task<MembershipList<Group>> getMemberOfList = _svc.GetGroupMemberOfListAsync( g, true );
                    Task<IEnumerable<GroupMembershipItem>> getGroupMembershipHierarchy = _svc.GetGroupMembershipHierarchyAsync( g.UId, true );

                    membersList = await getMembersList;
                    membersDest = _mapper.Map<List<SecurityPrincipalBase>, List<MemberVM>>( membersList.MemberList );
                    notMembersDest = _mapper.Map<List<SecurityPrincipalBase>, List<MemberVM>>( membersList.NonMemberList );

                    memberOfList = await getMemberOfList;
                    memberOfDest = _mapper.Map<List<Group>, List<MemberVM>>( memberOfList.MemberList );
                    notMemberOfDest = _mapper.Map<List<Group>, List<MemberVM>>( memberOfList.NonMemberList );

                    List<GroupMembershipItem> groupMembershipHierarchy = (List<GroupMembershipItem>)await getGroupMembershipHierarchy;
                    // Build the group hierarchy data for the treelist
                    // 1. get root nodes
                    List<GroupMembershipItem> rootnodes = new List<GroupMembershipItem>();
                    foreach( GroupMembershipItem gmi in groupMembershipHierarchy )
                    {
                        if( rootnodes.Find( x => x.GroupUId == gmi.GroupUId ) == null )
                        {
                            if( groupMembershipHierarchy.Find( h => h.MemberUId == gmi.GroupUId ) == null )
                                rootnodes.Add( new GroupMembershipItem { GroupUId = gmi.GroupUId, MemberUId = gmi.GroupUId, Group = gmi.Group, Member = gmi.Member } );
                        }
                    }
                    //List<GroupHierarchyVM> rootnodes = gm.Where( i => (gm.Count( x => x.MemberUId == i.GroupUId ) == 0) )
                    //    .Select( i => new GroupHierarchyVM { GroupUId = null, MemberUId = i.GroupUId, Name = i.Group.Name, Description = i.Group.Description, IsEnabled = i.Group.IsEnabled, IsLocal = i.Group.IsLocal, IsUser = i.Group.IsUser } )
                    //    .Distinct( new GroupHierarchyVMEqualityComparer() )
                    //    .ToList();
                    // gh = _mapper.Map<IEnumerable<GroupMembershipItem>, List<GroupHierarchyVM>>( gm );
                    // gh.AddRange( rootnodes );
                    gh = new List<GroupHierarchyVM>();

                    // 2. recursively get children
                    int id = 0;
                    foreach( GroupMembershipItem node in rootnodes )
                    {
                        gh.Add( new GroupHierarchyVM { Id = ++id, ParentId = null, MemberUId = node.GroupUId, GroupUId = null, Name = node.Group.Name, Description = node.Group.Description, IsEnabled = node.Group.IsEnabled, IsLocal = node.Group.IsLocal, IsUser = node.Group.IsUser } );
                        gh.AddRange( recurseGetGroupHierarchyChildren( node, groupMembershipHierarchy, ref id, id ) );
                    }

                    ok = true;

                }
                else
                {
                    _logger.LogError( $"Error updating group {sp.UId} | {sp.Name}" );
                }
            }
            catch( Exception ex )
            {
                ModelState.AddModelError( string.Empty, ex.Message );
                _logger.LogError( ex, $"Error saving group {sp.UId} | {sp.Name}" );
            }

            ResponseVM r = new ResponseVM()
            {
                Status = ok ? SUCCESS : ERROR,
                Message = ok ? null : $"Unable to save Group {sp.Name}. Clear the error(s) and try again.",
                ValidationErrors = ok ? null : ModelState.Keys.SelectMany( k => ModelState[k].Errors )
                      .Select( m => m.ErrorMessage ).ToList(),
                // Data = new { Group = (ok ? sp : null) }
                Data = ok ? new GroupVM { Group = sp, MemberOf = memberOfDest, Members = membersDest, GroupHierarchy = gh, NotMemberOf = notMemberOfDest, NotMembers = notMembersDest } : null
            };

            //https://www.telerik.com/blogs/handling-server-side-validation-errors-in-your-kendo-ui-grid
            //https://techbrij.com/modelstate-errors-angularjs-asp-net-mvc
            //https://www.jerriepelser.com/blog/validation-response-aspnet-core-webapi/
            return Json( r );
        }
        [HttpPost]
        public async Task<IActionResult> DeleteGroup(Guid uId)
        {
            string error = null;
            Group g = null;
            _logger.LogInformation( $"In DeleteGroup({nameof( uId )}:{uId})" );

            ResponseVM r = null;
            try
            {
                g = await _svc.GetGroupByUIdAsync( uId );
                if( g.IsBuiltIn )
                {
                    error = $"Group {g.Name} cannot be deleted as it is a built-in group.";
                }
                else
                {
                    await _svc.DeleteGroupAsync( uId );
                }

            }
            catch( Exception ex )
            {
                _logger.LogError( ex, $"Error deleting Group {uId}" );
                error = $"An error has occurred while deleting Group {g.Name}.";
            }
            r = new ResponseVM()
            {
                Status = string.IsNullOrEmpty( error ) ? SUCCESS : ERROR,
                Message = error
            };
            return Json( r );
        }

        #endregion

        #region Secure Objects
        public async Task<IActionResult> GetSecureObjectTree([DataSourceRequest] DataSourceRequest request)
        {
            _logger.LogInformation( $"In GetSecureObjectTree()" );

            List<SecureObjectTreeVM> treeList = null;
            try
            {
                IEnumerable<SecureObject> secureObjects = await _svc.GetSecureObjectsAsync();

                //treeList.AddRange(_mapper.Map<IEnumerable<SecureObject>, List<SecureObjectTreeVM>>(secureObjects.SelectRecursive(i => i.Children).ToList()));
                treeList = _mapper.Map<IEnumerable<SecureObject>, List<SecureObjectTreeVM>>( secureObjects.SelectRecursive( i => i.Children ).ToList() );
                //treeList.Sort((x, y) => x.UniqueName.CompareTo(y.UniqueName));
            }
            catch( Exception ex )
            {
                ModelState.AddModelError( string.Empty, ex.Message );
                _logger.LogError( ex, $"Error getting secure objects" );

            }
            if( treeList == null )
            {
                treeList = new List<SecureObjectTreeVM>();
            }
            return Json( treeList.ToTreeDataSourceResult( request, ModelState ) );
        }

        public async Task<IActionResult> GetSecureObjectByUId(Guid uId)
        {
            _logger.LogInformation( $"In GetSecureObjectByUId({nameof( uId )}:{uId})" );
            ResponseVM r = null;

            try
            {
                SecureObject so = await _svc.GetSecureObjectByUIdAsync( uId, includeChildren: false, includeDisabled: true );
                SecureObjectEditorVM editorVM = _mapper.Map<SecureObject, SecureObjectEditorVM>( so );
                // use this if using automapper gets too difficult
                //editorVM.Security.Dacl = so.Security.Dacl.Select(x => new DaclVM() { UId = x.UId, TrusteeUId = x.TrusteeUId, Allowed = x.Allowed, Inheritable = x.Inheritable, RightType = x.RightData.FriendlyTypeName, Right = x.RightData.Name.Split(new string[] { ", " }, StringSplitOptions.None) }).ToList();

                r = new ResponseVM()
                {
                    Status = SUCCESS,
                    Data = editorVM
                };
            }
            catch( Exception ex )
            {
                _logger.LogError( ex, $"Error getting secure object {uId}" );
                r = new ResponseVM()
                {
                    Status = ERROR,
                    Message = $"An error has occurred while retrieving secure object {uId}."
                };
            }
            return Json( r );
            //return Json(r, new JsonSerializerSettings()
            //{
            //    Converters = new List<Newtonsoft.Json.JsonConverter>
            //    {
            //    new Newtonsoft.Json.Converters.StringEnumConverter()
            //    }
            //});
        }
        [HttpPost]
        public async Task<IActionResult> SaveSecureObject([FromBody] SecureObjectEditorVM model)
        {
            _logger.LogInformation( $"In SaveSecureObject({nameof( model )}:{Newtonsoft.Json.JsonConvert.SerializeObject( model )})" );
            bool ok = false;
            SecureObject so = null;
            ResponseVM r = null;

            // check unique name

            try
            {
                // validate
                SecureObject found = await _svc.GetSecureObjectByUniqueNameAsync( model.UniqueName, includeChildren: false, includeDisabled: true );

                if( model.UId == null )
                {
                    if( found != null )
                    {
                        ModelState.AddModelError( "Unique Name", "Unique Name has already been used. Please choose another one." );
                    }
                }
                else
                {
                    if( found != null && found.UId != model.UId )
                    {
                        ModelState.AddModelError( "Unique Name", "Unique Name has already been used. Please choose another one." );
                    }
                }

                if( ModelState.IsValid )
                {

                    if( model.UId == null )  // new
                    {
                        //model.UId = Guid.NewGuid();
                        so = new SecureObject();
                    }
                    else
                    {
                        so = (SecureObject)await _svc.GetSecureObjectByUIdAsync( model.UId.Value, includeChildren: false, includeDisabled: true );
                    }

                    // existing dacl, sacl collection will be totally replaced
                    // if really want to handle mapping to existing collection refer to https://cpratt.co/using-automapper-mapping-instances/
                    //model.Dacl.ForEach( ace => ace.UId = ace.UId ?? Guid.NewGuid() );
                    //model.Sacl.ForEach( ace => ace.UId = ace.UId ?? Guid.NewGuid() );
                    foreach( DaclVM ace in model.Dacl)
                    {
                        ace.UId = ace.UId ?? Guid.NewGuid();
                        if( _rightTypeLookup.TryGetValue( ace.RightType, out string typeName ) )
                        {
                            ace.RightType = typeName;
                        }
                    }
                    foreach( SaclVM ace in model.Sacl )
                    {
                        ace.UId = ace.UId ?? Guid.NewGuid();
                        if( _rightTypeLookup.TryGetValue( ace.RightType, out string typeName ) )
                        {
                            ace.RightType = typeName;
                        }
                    }

                    _mapper.Map<SecureObjectEditorVM, SecureObject>( model, so );

                    DiscretionaryAcl dacl = new DiscretionaryAcl();
                    foreach( var item in model.Dacl )
                    {
                        
                        //switch( item.RightType )
                        //{
                        //    case "FileSystem":
                        //        dacl.Add( _mapper.Map<DaclVM, AccessControlEntry<FileSystemRight>>( item ) );
                        //        break;
                        //    case "Record":
                        //        dacl.Add( _mapper.Map<DaclVM, AccessControlEntry<RecordRight>>( item ) );
                        //        break;
                        //    case "UI":
                        //        dacl.Add( _mapper.Map<DaclVM, AccessControlEntry<UIRight>>( item ) );
                        //        break;
                        //    case "Synchronization":
                        //        dacl.Add( _mapper.Map<DaclVM, AccessControlEntry<SynchronizationRight>>( item ) );
                        //        break;
                        //}

                        IAccessControlEntry ace = AccessControlEntryUtilities.MakeAceFromRightType( item.RightType );
                        dacl.Add( _mapper.Map( item, ace ) );
                    }
                    SystemAcl sacl = new SystemAcl();
                    foreach( var item in model.Sacl )
                    {
                        //switch( item.RightType )
                        //{
                        //    case "FileSystem":
                        //        sacl.Add( _mapper.Map<SaclVM, AccessControlEntryAudit<FileSystemRight>>( item ) );
                        //        break;
                        //    case "Record":
                        //        sacl.Add( _mapper.Map<SaclVM, AccessControlEntryAudit<RecordRight>>( item ) );
                        //        break;
                        //    case "UI":
                        //        sacl.Add( _mapper.Map<SaclVM, AccessControlEntryAudit<UIRight>>( item ) );
                        //        break;
                        //    case "Synchronization":
                        //        sacl.Add( _mapper.Map<SaclVM, AccessControlEntryAudit<SynchronizationRight>>( item ) );
                        //        break;
                        //}
                        IAccessControlEntryAudit ace = (IAccessControlEntryAudit)AccessControlEntryUtilities.MakeAceFromRightType( rightTypeName:item.RightType, isAuditAce:true );
                        sacl.Add( _mapper.Map( item, ace ) );

                    }
                    so.Security.Dacl = dacl;
                    so.Security.Sacl = sacl;
                    await _svc.UpsertSecureObjectAsync( so );
                    model = _mapper.Map<SecureObject, SecureObjectEditorVM>( so );    // refresh the model

                    ok = true;
                }
                else
                {
                    _logger.LogError( $"Error saving Secure Object {model.UId} | {model.UniqueName}" );
                }


            }
            catch( Exception ex )
            {
                ModelState.AddModelError( string.Empty, ex.Message );
                _logger.LogError( ex, $"Error saving Secure Object" );
            }

            r = new ResponseVM()
            {
                Status = ok ? SUCCESS : ERROR,
                Data = ok ? model : null,
                Message = ok ? null : "Unable to save Secure Object due to errors.",
                ValidationErrors = ok ? null : ModelState.Keys.SelectMany( k => ModelState[k].Errors )
                          .Select( m => m.ErrorMessage ).ToList(),
            };

            return Json( r );
        }
        [HttpPost]
        public async Task<IActionResult> DeleteSecureObject(Guid uId)
        {
            string error = null;
            _logger.LogInformation( $"In DeleteSecureObject({nameof( uId )}:{uId})" );

            ResponseVM r = null;
            try
            {
                await _svc.DeleteSecureObjectAsync( uId );
            }
            catch( Exception ex )
            {
                _logger.LogError( ex, $"Error deleting Secure Object {uId}" );
                error = $"An error has occurred while deleting Secure Object.";
            }
            r = new ResponseVM()
            {
                Status = string.IsNullOrEmpty( error ) ? SUCCESS : ERROR,
                Message = error
            };
            return Json( r );
        }
        [HttpPost]
        public async Task<IActionResult> UpdateSecureObjectParent(Guid uId, Guid? parentUId)
        {
            string error = null;
            _logger.LogInformation( $"In UpdateSecureObjectParent({nameof( uId )}:{uId}), {nameof( parentUId )}:{parentUId}" );
            ResponseVM r = null;

            try
            {
                await _svc.UpdateSecureObjectParentUIdAsync( uId, parentUId );
            }
            catch( Exception ex )
            {
                _logger.LogError( ex, $"Error updating parent of Secure Object {uId}" );
                error = $"An error has occurred while attempting to update parent of Secure Object.";
            }

            r = new ResponseVM()
            {
                Status = string.IsNullOrEmpty( error ) ? SUCCESS : ERROR,
                Message = error
            };
            return Json( r );
        }

        #endregion

    }
}
