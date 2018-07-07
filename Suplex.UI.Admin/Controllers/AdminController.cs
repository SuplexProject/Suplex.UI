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
using Suplex.Security.AclModel.DataAccess;
using AutoMapper;
using System.Collections;
using Suplex.UI.Modules.Admin.Helpers;
using Microsoft.Extensions.Configuration;
using Suplex.Security.AclModel;

namespace Suplex.UI.Modules.Admin.Controllers
{
    public class Admin : Controller
    {
        private IConfiguration _configuration;
        private readonly ILogger<Admin> _logger;
        private readonly IHostingEnvironment _hostingEnvironment;
        private readonly IMapper _mapper;
        private int _maskSize;
        private static FileStore _fileStore;
        private static MemoryDal _dal;
        private static List<RightVM> _rights = null;
        private static List<EnumVM> _auditTypes = null;
        private static Dictionary<string, Object> _secureObjectDefaults = null;
        const string SUCCESS = "success";
        const string ERROR = "error";
        public Admin(IConfiguration configuration, ILogger<Admin> logger, IHostingEnvironment hostingEnvironment, IMapper mapper)
        {
            _configuration = configuration;
            //_maskSize = int.Parse(_configuration["MaskSize"]);
            int.TryParse(_configuration["MaskSize"], out _maskSize);

            _logger = logger;
            _hostingEnvironment = hostingEnvironment;
            _mapper = mapper;

            _auditTypes = _auditTypes ?? EnumHelpers.ToList(typeof(AuditType));

            _rights = _rights ?? SetupRightsValues();

            _secureObjectDefaults = _secureObjectDefaults ?? SetupSecureObjectDefaults();

        }

        public IActionResult Index()
        {
            _logger.LogInformation("index");
            Console.WriteLine(_hostingEnvironment.ContentRootPath);

            // reset file store and memory dal 
            _fileStore = new FileStore();
            _dal = _fileStore.Dal;

            return View();

        }
        public IActionResult Test()
        {
            return View();
        }
        public Dictionary<string, Object> SetupSecureObjectDefaults()
        {
            Dictionary<string, Object> defaultValues = new Dictionary<string, Object>();

            SecureObject so = new SecureObject();
            defaultValues.Add("IsEnabled", so.IsEnabled);
            defaultValues.Add("DaclAllowInherit", so.Security.DaclAllowInherit);
            defaultValues.Add("SaclAllowInherit", so.Security.SaclAllowInherit);
            int defAuditTypeFilter = (int)so.Security.SaclAuditTypeFilter;
            defaultValues.Add("SaclAuditTypeFilter", defAuditTypeFilter); //.ToStringArray());
            int[] defAuditTypeFilterArray = Enum.GetValues(typeof(AuditType)).Cast<int>().Where(i => (i & defAuditTypeFilter) == i).ToArray();
            defaultValues.Add("SaclAuditTypeFilterArray", defAuditTypeFilterArray);
            AccessControlEntry<FileSystemRight> dacl = new AccessControlEntry<FileSystemRight>();
            defaultValues.Add("DaclAllowed", dacl.Allowed);
            defaultValues.Add("DaclInheritable", dacl.Inheritable);
            AccessControlEntryAudit<FileSystemRight> sacl = new AccessControlEntryAudit<FileSystemRight>();
            defaultValues.Add("SaclAllowed", sacl.Allowed);
            defaultValues.Add("SaclInheritable", sacl.Inheritable);
            defaultValues.Add("SaclDenied", sacl.Denied);

            return defaultValues;
        }
        public List<RightVM> SetupRightsValues()
        {
            List<Type> types = new List<Type>() { typeof(UIRight), typeof(RecordRight), typeof(FileSystemRight), typeof(SynchronizationRight) };
            List<RightVM> rights = new List<RightVM>();
            foreach (Type t in types)
            {
                rights.AddRange(EnumHelpers.ToList(t).Select(s => new RightVM { RightType = t.GetFriendlyRightTypeName(), RightId = s.Id, RightName = s.Name }).OrderBy(o => o.RightType).ThenByDescending(o => o.RightId).ToList());
            }
            return rights;
        }
        public IActionResult GetRights()
        {
            return Json(_rights);
        }
        public IActionResult GetAuditTypes()
        {
            return Json(_auditTypes);
        }
        public IActionResult GetSecureObjectDefaults()
        {
            return Json(_secureObjectDefaults);
        }
        [ResponseCache(Duration = 10, VaryByQueryKeys = new[] { "*" })]
        public IActionResult GetDirectoryContents(string path)
        {
            // need to deal with unauthorised access?
            string dir = path;
            List<FileSystemObjectVM> entries;
            if (dir == null)
                entries = DriveInfo.GetDrives()
                        .Where(d => d.IsReady)
                        .Select(e => new FileSystemObjectVM()
                        {
                            Path = e.Name,
                            Name = e.Name,
                            Type = FileSystemObjectType.Drive,
                            HasChildren = true
                        }).ToList();
            else
                entries = new DirectoryInfo(dir)
                        .EnumerateFileSystemInfos()
                        //.Where(d => ((d.Attributes & FileAttributes.Hidden) == 0) && ((d.Attributes & FileAttributes.System) == 0) && (d.Extension == ".splx"))
                        .Where(d => (d.Attributes & FileAttributes.Hidden) == 0)
                        .Where(d => (d.Attributes & FileAttributes.System) == 0)
                        .Where(d => ((d.Attributes & FileAttributes.Directory) == FileAttributes.Directory) || (d.Extension == ".splx"))
                        .Select(entry => new FileSystemObjectVM()
                        {
                            Path = Path.Combine(dir, (entry is DirectoryInfo ? entry.Name + Path.DirectorySeparatorChar : entry.Name)), // if is directory append directory separator at the end
                            Name = entry.Name,
                            Type = (entry is DirectoryInfo ? FileSystemObjectType.Folder : FileSystemObjectType.File),
                            HasChildren = entry is DirectoryInfo
                        }).ToList();

            return Json(entries);
        }

        public IActionResult NewFile()
        {
            ResponseVM r = new ResponseVM();

            _fileStore = new FileStore();
            _dal = _fileStore.Dal;
            r.Status = SUCCESS;
            return Json(r);
        }
        [ResponseCache(Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult OpenFile(string fileName)
        {
            _logger.LogInformation($"In OpenFile({nameof(fileName)}:{fileName})");

            bool ok = false;

            ResponseVM r = null;

            if (!string.IsNullOrWhiteSpace(fileName) && System.IO.File.Exists(fileName))
            {
                _fileStore = null;
                _dal = null;
                try
                {
                    _fileStore = FileStore.FromYamlFile(fileName);
                    _dal = _fileStore.Dal;
                    ok = true;                    
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Error opening file {fileName}");                    
                }
            }
            else
            {
                _logger.LogError($"Error opening file {fileName}. File not found.");
            }
            r = new ResponseVM()
            {
                Status = ok ? SUCCESS : ERROR,
                Message = ok ? null : $"There is a problem opening file {fileName}"
            };
            return Json(r);
        }
        [HttpPost]
        [ResponseCache(Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult SaveFile(string fileName = null)
        {
            bool ok = false;
            _logger.LogInformation($"In SaveFile({nameof(fileName)}:{fileName})");
            ResponseVM r = null;
            
            try
            {
                if (string.IsNullOrWhiteSpace(fileName) && string.IsNullOrWhiteSpace(_fileStore.CurrentPath))
                    throw new ArgumentException("File name not provided");

                if (!string.IsNullOrWhiteSpace(fileName))
                    _fileStore.ToYamlFile(fileName);
                else
                    _fileStore.ToYamlFile();
                ok = true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error saving file {fileName}");
            }
            r = new ResponseVM()
            {
                Status = ok ? SUCCESS : ERROR,
                Message = ok ? null : $"There is a problem saving to file {fileName}"
            };
            return Json(r);
        }
        #region Security Principals
        [ResponseCache(Duration = 10, VaryByQueryKeys = new[] { "*" })]
        public IActionResult GetSecurityPrincipals([DataSourceRequest] DataSourceRequest request)
        {
            IList<Group> groups = _dal.Store.Groups;
            IList<User> users = _dal.Store.Users;

            List<SecurityPrincipalListItemVM> sp = _mapper.Map<IList<User>, List<SecurityPrincipalListItemVM>>(users);
            sp.AddRange(_mapper.Map<IList<Group>, List<SecurityPrincipalListItemVM>>(groups));

            return Json(sp.ToDataSourceResult(request));
        }
        #endregion

        [ResponseCache(Duration = 10, VaryByQueryKeys = new[] { "*" })]
        public IActionResult GetUserByUId(Guid uId)
        {
            _logger.LogInformation($"In GetUserByUId({nameof(uId)}:{uId})");

            SecurityPrincipalEditorVM sp = null;
            ResponseVM r = null;
            try
            {
                // get user
                User u = _dal.GetUserByUId(uId);
                sp = _mapper.Map<User, SecurityPrincipalEditorVM>(u);

                MembershipList<Group> memberList = _dal.GetGroupMembershipListOf(u, true);
                List<MemberVM> memberOf = _mapper.Map<List<Group>, List<MemberVM>>(memberList.MemberList);
                List<MemberVM> notMemberOf = _mapper.Map<List<Group>, List<MemberVM>>(memberList.NonMemberList);
                r = new ResponseVM()
                {
                    Status = SUCCESS,
                    Data = new UserVM { User = sp, MemberOf = memberOf, NotMemberOf = notMemberOf }
                };
            }

            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving information for user {uId}");
                r = new ResponseVM()
                {
                    Status = ERROR,
                    Message = $"There is a problem retrieving information for user {uId}"
                };
            }
            return Json(r);
        }

        public IActionResult GetNewUser()
        {
            _logger.LogInformation($"In GetNewUser()");

            SecurityPrincipalEditorVM sp = null;
            ResponseVM r = null;
            //List<Group> g = null;
            try
            {
                // cannot instantiate a new User at this stage. We don't want to have the GUId set at this stage
                //User u = new User();
                //sp = _mapper.Map<User, SPEditorVM>(u);
                sp = new SecurityPrincipalEditorVM() { IsUser = true, IsEnabled = true };

                // exclude external groups
                List<Group> allGroups = _dal.Store.Groups.Where(g => g.IsLocal).ToList();
                List<MemberVM> memberOf = new List<MemberVM>();
                List<MemberVM> notMemberOf = _mapper.Map<List<Group>, List<MemberVM>>(allGroups);

                r = new ResponseVM()
                {
                    Status = SUCCESS,
                    Data = new UserVM { User = sp, MemberOf = memberOf, NotMemberOf = notMemberOf }
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving information for new user");
                r = new ResponseVM()
                {
                    Status = ERROR,
                    Message = $"There is a problem retrieving information for new user"
                };
            }
            return Json(r);
        }
        [HttpPost]
        [ResponseCache(Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult SaveUser([FromBody] UserSaveVM userSave)
        {
            bool ok = false;
            _logger.LogInformation($"In SaveUser({nameof(userSave)}:{userSave})");

            SecurityPrincipalEditorVM user = userSave.User;
            List<MemberVM> toAdd = userSave.MembersOfToAdd;
            List<MemberVM> toRemove = userSave.MembersOfToRemove;
            try
            {
                // validate name: must be unique
                // if new user
                if (user.UId == null)
                {
                    if (_dal.GetUserByName(user.Name).Count != 0 || _dal.GetGroupByName(user.Name).Count != 0)
                    {
                        ModelState.AddModelError("Name", "Name has already been used. Please choose another one.");
                    }
                }
                else
                {
                    if (_dal.GetUserByName(user.Name).Where(u => u.UId != user.UId).Count() != 0 ||
                        _dal.GetGroupByName(user.Name).Count != 0)
                    {
                        ModelState.AddModelError("Name", "Name has already been used. Please choose another one.");
                    }
                }

                if (ModelState.IsValid)
                {
                    // if new user
                    if (user.UId == null)
                    {
                        user.UId = Guid.NewGuid();
                    }

                    User u = _mapper.Map<SecurityPrincipalEditorVM, User>(user);
                    _dal.UpsertUser(u);

                    List<GroupMembershipItem> groupMembershipToAdd = new List<GroupMembershipItem>();
                    foreach (MemberVM g in toAdd)
                    {
                        groupMembershipToAdd.Add(new GroupMembershipItem { GroupUId = g.UId, MemberUId = u.UId.Value, IsMemberUser = true });
                    }

                    List<GroupMembershipItem> groupMembershipToRemove = new List<GroupMembershipItem>();
                    foreach (MemberVM g in toRemove)
                    {
                        groupMembershipToRemove.Add(new GroupMembershipItem { GroupUId = g.UId, MemberUId = u.UId.Value, IsMemberUser = true });
                    }

                    foreach (GroupMembershipItem i in groupMembershipToAdd)
                    {
                        _dal.UpsertGroupMembership(i);
                    }
                    foreach (GroupMembershipItem i in groupMembershipToRemove)
                    {
                        _dal.DeleteGroupMembership(i);
                    }
                    ok = true;
                }
                else
                {
                    _logger.LogError($"Error updating user {user.UId} | {user.Name}");
                }
            }
            catch (Exception ex)
            {
                ModelState.AddModelError(string.Empty, ex.Message);
                _logger.LogError(ex, $"Error updating user {user.UId} | {user.Name}");
            }

            ResponseVM r = new ResponseVM()
            {
                Status = ok ? SUCCESS : ERROR,
                Message = ok ? null : $"Unable to save User {user.Name}. Clear the error(s) and try again.",
                Errors = ok ? null : ModelState.Keys.SelectMany(k => ModelState[k].Errors)
                              .Select(m => m.ErrorMessage).ToList(),
                Data = new { User = user }
            };

            //https://www.telerik.com/blogs/handling-server-side-validation-errors-in-your-kendo-ui-grid
            //https://techbrij.com/modelstate-errors-angularjs-asp-net-mvc
            //https://www.jerriepelser.com/blog/validation-response-aspnet-core-webapi/
            return Json(r);
        }

        [ResponseCache(Duration = 10, VaryByQueryKeys = new[] { "*" })]
        public IActionResult GetGroupByUId(Guid uId)
        {

            _logger.LogInformation($"In GetGroupByUId({nameof(uId)}:{uId})");
            
            SecurityPrincipalEditorVM sp = null;
            ResponseVM r = null;
            try
            {
                Group g = _dal.GetGroupByUId(uId);
                sp = _mapper.Map<Group, SecurityPrincipalEditorVM>(g);

                MembershipList<SecurityPrincipalBase> memberList = _dal.GetGroupMembershipList(g, true);
                List<MemberVM> members = _mapper.Map<List<SecurityPrincipalBase>, List<MemberVM>>(memberList.MemberList);
                List<MemberVM> nonMembers = _mapper.Map<List<SecurityPrincipalBase>, List<MemberVM>>(memberList.NonMemberList);

                // Group hierarchy
                List<GroupMembershipItem> gm = _dal.GetGroupMembership(uId).ToList();
                List<GroupHierarchyVM> rootnodes = gm.Where(i => (gm.Count(x => x.MemberUId == i.GroupUId) == 0))
                    .Select(i => new GroupHierarchyVM { GroupUId = null, MemberUId = i.GroupUId, Name = i.Group.Name, Description = i.Group.Description, IsEnabled = i.Group.IsEnabled, IsLocal = i.Group.IsLocal, IsUser = i.Group.IsUser }).ToList();

                List<GroupHierarchyVM> gh = _mapper.Map<List<GroupMembershipItem>, List<GroupHierarchyVM>>(gm);
                
                gh.AddRange(rootnodes);

                r = new ResponseVM()
                {
                    Status = SUCCESS,
                    Data = new GroupVM { Group = sp, Members = members, NonMembers = nonMembers, GroupHierarchy = gh }
                };
            }

            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving information for group {uId}");
                r = new ResponseVM()
                {
                    Status = ERROR,
                    Message = $"There is a problem retrieving information for group {uId}"
                };
            }
            return Json(r);
        }

        public IActionResult GetNewGroup()
        {
            _logger.LogInformation($"In GetNewGroup()");

            SecurityPrincipalEditorVM sp = null;
            ResponseVM r = null;
            try
            {
                // cannot instantiate a new User at this stage. We don't want to have the GUId set at this stage
                //Group g = new Group();
                //sp = _mapper.Map<Group, SPEditorVM>(g);
                sp = new SecurityPrincipalEditorVM() { IsUser = false, IsEnabled = true };

                // non members = all security principals
                List<MemberVM> nonMembers = _mapper.Map<List<Group>, List<MemberVM>>(_dal.Store.Groups.ToList());
                nonMembers.AddRange(_mapper.Map<List<User>, List<MemberVM>>(_dal.Store.Users.ToList()));

                r = new ResponseVM()
                {
                    Status = SUCCESS,
                    Data = new GroupVM { Group = sp, Members = new List<MemberVM>(), NonMembers = nonMembers, GroupHierarchy = new List<GroupHierarchyVM>() }
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving information for new group");
                r = new ResponseVM()
                {
                    Status = ERROR,
                    Message = $"There is a problem retrieving information for new group"
                };
            }
            return Json(r);
        }
        [HttpPost]
        [ResponseCache(Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult SaveGroup([FromBody] GroupSaveVM groupSave)
        {
            bool ok = false;
            _logger.LogInformation($"In SaveGroup({nameof(groupSave)}:{groupSave})");
            SecurityPrincipalEditorVM group = groupSave.Group;
            List<MemberVM> toAdd = groupSave.MembersToAdd;
            List<MemberVM> toRemove = groupSave.MembersToRemove;
            try
            {
                // validate name: must be unique
                // if new user
                if (group.UId == null)
                {
                    if (_dal.GetGroupByName(group.Name).Count != 0 || _dal.GetUserByName(group.Name).Count != 0)
                    {
                        ModelState.AddModelError("Name", "Name has already been used.. Please choose another one.");
                    }
                }
                else
                {
                    if (_dal.GetGroupByName(group.Name).Where(u => u.UId != group.UId).Count() != 0 ||
                        _dal.GetUserByName(group.Name).Count != 0)
                    {
                        ModelState.AddModelError("Name", "Name has already been used.. Please choose another one.");
                    }
                }

                if (ModelState.IsValid)
                {
                    // if new user
                    if (group.UId == null)
                    {
                        group.UId = Guid.NewGuid();
                        if (_maskSize == 0)
                        {
                            group.Mask = "0";
                        }
                        else
                        {
                            BitArray maskBitArray = _dal.Store.Groups.GetNextMask(_maskSize);
                            group.Mask = MaskConverter.BitArrayToString(maskBitArray);
                        }
                    }

                    Group g = _mapper.Map<SecurityPrincipalEditorVM, Group>(group);
                    _dal.UpsertGroup(g);

                    if (g.IsLocal)
                    {
                        List<GroupMembershipItem> groupMembershipToAdd = new List<GroupMembershipItem>();
                        foreach (MemberVM m in toAdd)
                        {
                            groupMembershipToAdd.Add(new GroupMembershipItem { GroupUId = g.UId.Value, MemberUId = m.UId, IsMemberUser = m.IsUser });
                        }

                        List<GroupMembershipItem> groupMembershipToRemove = new List<GroupMembershipItem>();
                        foreach (MemberVM m in toRemove)
                        {
                            groupMembershipToRemove.Add(new GroupMembershipItem { GroupUId = g.UId.Value, MemberUId = m.UId, IsMemberUser = m.IsUser });
                        }

                        foreach (GroupMembershipItem i in groupMembershipToAdd)
                        {
                            // need to resolve member and group fields before upsert? 
                            _dal.UpsertGroupMembership(i);
                        }
                        foreach (GroupMembershipItem i in groupMembershipToRemove)
                        {
                            _dal.DeleteGroupMembership(i);
                        }

                    }
                    else
                    {
                        // if external group, delete all members, including disabled members
                        foreach (GroupMembershipItem i in _dal.GetGroupMembers(g, true).ToList())
                        {
                            _dal.DeleteGroupMembership(i);
                        }
                    }
                    ok = true;

                }
                else
                {
                    _logger.LogError($"Error updating group {group.UId} | {group.Name}");
                }
            }
            catch (Exception ex)
            {
                ModelState.AddModelError(string.Empty, ex.Message);
                _logger.LogError(ex, $"Error saving group {group.UId} | {group.Name}");
            }

            ResponseVM r = new ResponseVM()
            {
                Status = ok ? SUCCESS : ERROR,
                Message = ok ? null : $"Unable to save Group {group.Name}. Clear the error(s) and try again.",
                Errors = ok ? null : ModelState.Keys.SelectMany(k => ModelState[k].Errors)
                              .Select(m => m.ErrorMessage).ToList(),
                Data = new { Group = group }
            };

            //https://www.telerik.com/blogs/handling-server-side-validation-errors-in-your-kendo-ui-grid
            //https://techbrij.com/modelstate-errors-angularjs-asp-net-mvc
            //https://www.jerriepelser.com/blog/validation-response-aspnet-core-webapi/
            return Json(r);
        }

        [HttpPost]
        [ResponseCache(Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult DeleteUser(Guid uId)
        {
            string error = null;
            User u = null;
            _logger.LogInformation($"In DeleteUser({nameof(uId)}:{uId})");

            ResponseVM r = null;
            try
            {
                u = _dal.GetUserByUId(uId);
                if (u.IsBuiltIn)
                {
                    error = $"User {u.Name} cannot be deleted as it is a built-in user.";
                }
                else
                {
                    _dal.DeleteUser(uId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error deleting information user {uId}");
                error = $"An error has occurred while deleting User {u.Name}.";
            }
            r = new ResponseVM()
            {
                Status = string.IsNullOrEmpty(error) ? SUCCESS : ERROR,
                Message = error
            };
            return Json(r);
        }
        [HttpPost]
        [ResponseCache(Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult DeleteGroup(Guid uId)
        {
            string error = null;
            Group g = null;
            _logger.LogInformation($"In DeleteGroup({nameof(uId)}:{uId})");

            ResponseVM r = null;
            try
            {
                g = _dal.GetGroupByUId(uId);
                if (g.IsBuiltIn)
                {
                    error = $"Group {g.Name} cannot be deleted as it is a built-in group.";
                }
                else
                {
                    _dal.DeleteGroup(uId);
                }
                
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error deleting information group {uId}");
                error = $"An error has occurred while deleting Group {g.Name}.";
            }
            r = new ResponseVM()
            {
                Status = string.IsNullOrEmpty(error) ? SUCCESS : ERROR,
                Message = error
            };
            return Json(r);
        }
        [ResponseCache(Duration = 10, VaryByQueryKeys = new[] { "*" })]
        public IActionResult GetAllTrustees()
        {
            _logger.LogInformation($"In GetAllTrustees()");

            List<TrusteeVM> trustees = _mapper.Map<IList<Group>, List<TrusteeVM>>(_dal.Store.Groups);

            return Json(trustees);
        }

        #region Secure Objects
        [ResponseCache(Duration = 10, VaryByQueryKeys = new[] { "*" })]
        public IActionResult GetSecureObjectTreeItems(Guid? uId)
        {
            _logger.LogInformation($"In GetSecureObjectTreeItems({nameof(uId)}:{uId})");
            List<SecureObjectTreeItemVM> secureObjectTreeItems = null;
            try
            {
                if (uId == null)
                {
                    secureObjectTreeItems = _dal.Store.SecureObjects.Where(s => s.ParentUId == null)
                        .Select(so => new SecureObjectTreeItemVM { UId = so.UId, UniqueName = so.UniqueName, HasChildren = (so.Children.Count > 0 ? true : false) }).ToList();
                }
                else
                {
                    secureObjectTreeItems = _dal.GetSecureObjectByUId(uId.Value, true).Children.OfType<SecureObject>().Select(item => new SecureObjectTreeItemVM { UId = item.UId, UniqueName = item.UniqueName, HasChildren = (item.Children.Count > 0 ? true : false) }).ToList();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting secure object {uId}");
                secureObjectTreeItems = new List<SecureObjectTreeItemVM>();
            }
            return Json(secureObjectTreeItems);
        }
        [ResponseCache(Duration = 10, VaryByQueryKeys = new[] { "*" })]
        public IActionResult GetSecureObjectByUId(Guid uId)
        {
            _logger.LogInformation($"In GetSecureObjectByUId({nameof(uId)}:{uId})");
            ResponseVM r = null;

            try
            {
                SecureObject so = (SecureObject)_dal.GetSecureObjectByUId(uId, includeDisabled: true);
                SecureObjectEditorVM editorVM = _mapper.Map<SecureObject, SecureObjectEditorVM>(so);
                // use this if using automapper is too difficult
                //editorVM.Security.Dacl = so.Security.Dacl.Select(x => new DaclVM() { UId = x.UId, TrusteeUId = x.TrusteeUId, Allowed = x.Allowed, Inheritable = x.Inheritable, RightType = x.RightData.FriendlyTypeName, Right = x.RightData.Name.Split(new string[] { ", " }, StringSplitOptions.None) }).ToList();

                r = new ResponseVM()
                {
                    Status = SUCCESS,
                    Data = editorVM
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting secure object {uId}");
                r = new ResponseVM()
                {
                    Status = ERROR,
                    Message = $"An error has occurred while retrieving secure object {uId}."
                };
            }
            return Json(r);
            //return Json(r, new JsonSerializerSettings()
            //{
            //    Converters = new List<Newtonsoft.Json.JsonConverter>
            //    {
            //    new Newtonsoft.Json.Converters.StringEnumConverter()
            //    }
            //});
        }
        //public IActionResult GetRightTypes()
        //{
        //    if (_rightTypes == null)
        //    {
        //        List<Type> types = new List<Type>() { typeof(UIRight), typeof(RecordRight), typeof(FileSystemRight), typeof(SynchronizationRight) };
        //        _rightTypes = new List<RightTypeVM>();

        //        foreach (Type t in types)
        //        {
        //            //_rightTypes.Add(new RightTypeVM { RightType = t.GetFriendlyRightTypeName(), Rights = Enum.GetNames(t) });
        //            _rightTypes.Add(new RightTypeVM { RightType = t.GetFriendlyRightTypeName(), Rights = EnumHelpers.EnumToList(t) });
        //        }
        //    }
        //    return Json(_rightTypes);
        //}
        
        // not required anymore since we pre-send all the defaults to the client at the start
        public IActionResult GetNewSecureObject()
        {
            _logger.LogInformation($"In GetNewSecureObject()");
            SecureObjectEditorVM soDTO = null;
            ResponseVM r = null;

            try
            {
                
                SecureObject so = new SecureObject();
                soDTO = _mapper.Map<SecureObject, SecureObjectEditorVM>(so);
                soDTO.UId = null;   // we want the UId to be null first to indicate it is a new record

                r = new ResponseVM()
                {
                    Status = SUCCESS,
                    Data = soDTO
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving information for new secure object");
                r = new ResponseVM()
                {
                    Status = ERROR,
                    Message = $"There is a problem retrieving information for new secure object"
                };
            }
            return Json(r);
        }

        #endregion

    }
    }
