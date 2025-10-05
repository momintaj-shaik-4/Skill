import { Component, OnInit, ElementRef, QueryList, AfterViewInit, ViewChildren } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

interface Competency {
  skill: string;
  competency: string;
  current_expertise: string;
  target_expertise: string;
  status: 'Met' | 'Gap' | 'Error';
}

interface AdditionalSkill {
  id: number;
  skill_name: string;
  skill_level: string;
  skill_category: string;
  description?: string;
  created_at?: string;
}

interface TeamMember {
  id: string;
  name: string;
  skills: Competency[];
  additional_skills?: AdditionalSkill[];
}

interface ManagerData {
  name: string;
  role: string;
  id: string;
  skills: Competency[];
  team: TeamMember[];
  manager_is_trainer: boolean;
}

interface TrainingDetail {
    id: number;
    division?: string;
    department?: string;
    competency?: string;
    skill?: string;
    training_name: string;
    training_topics?: string;
    prerequisites?: string;
    skill_category?: string;
    trainer_name: string;
    email?: string;
    training_date?: string;
    duration?: string;
    time?: string;
    training_type?: string;
    seats?: string;
    assessment_details?: string;
}

type LevelBlock = { level: number; items: string[] };
type Section = { title: string; subtitle?: string; levels: LevelBlock[] };

@Component({
  selector: 'app-manager-dashboard',
  templateUrl: './manager-dashboard.component.html',
  styleUrls: ['./manager-dashboard.component.css']
})
export class ManagerDashboardComponent implements OnInit, AfterViewInit {
  @ViewChildren('animatedElement') animatedElements!: QueryList<ElementRef>;
  private observer!: IntersectionObserver;

  activeTab: string = 'dashboard';
  manager: ManagerData | null = null;
  managerDisplayName: string = '';
  managerIsTrainer: boolean = false;
  isLoading = true;
  errorMessage: string = '';
  successMessage: string = '';
  totalTeamMembers: number = 0;
  teamSkillsMet: number = 0;
  teamSkillsGap: number = 0;
  topSkillGaps: any[] = [];
  assignedTrainingsCount: number = 0; // New metric!
  
  selectedTeamMember: TeamMember | null = null;

  editingSkill: { memberId: string, skillIndex: number } | null = null;
  editSkillData: { current_expertise: string, target_expertise: string } = { current_expertise: '', target_expertise: '' };

  selectedTraining: number | null = null;
  selectedMemberId: string | null = null;

  assignTrainingSearch: string = '';
  assignMemberSearch: string = '';

  mySkillsStatusFilter: 'All' | 'Met' | 'Gap' = 'All';
  mySkillsSkillFilter: 'All' | string = 'All';
  mySkillsSearch: string = '';
  teamSkillsStatusFilter: 'All' | 'Met' | 'Gap' = 'All';
  teamSkillsSkillFilter: 'All' | string = 'All';
  teamMemberNameFilter: 'All' | string = 'All';
  teamCompetencyFilter: 'All' | string = 'All';
  teamSkillsCurrentLevelFilter: 'All' | string = 'All';

  uniqueMySkills: string[] = [];
  uniqueTeamSkills: string[] = [];
  uniqueTeamMembers: string[] = [];
  uniqueCompetencies: string[] = [];
  uniqueCurrentLevels: string[] = [];

  skillLevels: string[] = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'];
  skillLevelsForFilter: string[] = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'];
  
  skillCategoryLevels: string[] = ['L1', 'L2', 'L3', 'L4', 'L5'];

  additionalSkills: any[] = [];
  newSkill = {
    name: '',
    level: 'Beginner',
    category: 'Technical',
    description: ''
  };
  showAddSkillForm: boolean = false;
  editingSkillId: number | null = null;
  additionalSkillLevels = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
  skillCategories = ['Technical', 'Soft Skills', 'Leadership', 'Communication', 'Project Management', 'Other'];
  
  showScheduleTrainingModal = false;
  trainingCatalog: TrainingDetail[] = [];
  catalogSearch: string = '';
  catalogTypeFilter: string = 'All';
  catalogCategoryFilter: string = 'All';
  
  newTraining = {
    division: '',
    department: '',
    competency: '',
    skill: '',
    training_name: '',
    training_topics: '',
    prerequisites: '',
    skill_category: 'L1',
    trainer_name: '',
    email: '',
    training_date: '',
    duration: '',
    time: '',
    training_type: 'Online',
    seats: '',
    assessment_details: ''
  };

  // Modal properties
  showDetailModal = false;
  modalTitle = '';
  modalData: any[] = [];
  modalDataType: 'members' | 'skills' | null = null;


  private readonly API_ENDPOINT = 'http://localhost:8000/data/manager/dashboard';

  levelsSearch = '';
  selectedSkill = '';
  sections: Section[] = [
    {
      title: 'EXAM',
      levels: [
        { level: 1, items: ['Launch EXAM', 'Test execution', 'Exporting reports'] },
        { level: 2, items: ['Implement test cases', 'Create collections', 'EXAM configuration', 'DOORS synchronization'] },
        { level: 3, items: ['Create short names', 'NeKeDa reporting', 'Debugging in EXAM'] },
        { level: 4, items: ['Implement libraries & common sequences', 'Know-how on libraries (1—4)', 'Create baselines', 'Release configuration', 'Update variable mapping', 'System configurations'] },
        { level: 5, items: ['EXAM administration', 'Model domain configuration', 'Set up new project', 'Groovy scripting'] }
      ]
    },
    {
      title: 'Softcar',
      levels: [
        { level: 1, items: ['Launch Softcar', 'Artifacts in Softcar'] },
        { level: 2, items: ['Blockboard & calibration variables', 'Add A2L variables', 'Logging'] },
        { level: 3, items: ['Debugging', 'Error simulation', 'CAN message error simulations', 'Script execution in Softcar'] },
        { level: 4, items: ['Create layouts', 'Trigger files', 'Startup script', 'Softcar scripting'] },
        { level: 5, items: ['Plant model creation', 'CAN configuration', 'DLL files'] }
      ]
    },
    {
      title: 'Python',
      subtitle: 'Foundational → application automation',
      levels: [
        { level: 1, items: ['Install packages', 'Syntax, data types, operators', 'Reserved keywords', 'Input/Output'] },
        { level: 2, items: ['Loops (for/while)', 'try/except', 'Strings', 'Lists/Dict/Sets methods', 'break/continue'] },
        { level: 3, items: ['Functions (incl. lambda, *args/**kwargs)', 'File handling', 'List comprehensions', 'Intro to classes & objects'] },
        { level: 4, items: ['Inheritance, encapsulation, polymorphism', 'Static/class methods', 'json', 'pip packages', 'Debugging with pdb & argparse'] },
        { level: 5, items: ['API requests', 'App development', 'Task automation with libs', 'Decorators & generators', 'Excel data ops, pickling'] }
      ]
    },
    {
      title: 'C++ (CPP)',
      subtitle: 'Skill matrix by domain',
      levels: [
        { level: 1, items: ['Core language: variables, loops, conditionals, functions', 'Memory: stack, basic pointers', 'OOP/Templates: basic class/struct, simple encapsulation', 'Std libs: I/O streams, arrays', 'Concurrency: none/very basic', 'HW interaction: none', 'Build: single-file or simple compile', 'Debugging: print-based', 'Architecture: simple procedural'] },
        { level: 2, items: ['Core: classes, inheritance, function overloading', 'Memory: dynamic allocation, manual new/delete', 'OOP: full OOP, virtual functions, basic templates', 'Std libs: STL containers, iterators, namespaces', 'Concurrency: std::thread, mutexes, condition variables, basics', 'HW: UART/SPI/I2C basics, polling/interrupt basics', 'Build: CMake/make projects', 'Debugging: IDE debuggers, tracing', 'Architecture: modular design, class hierarchies'] },
        { level: 3, items: ['Core: smart pointers, templates, lambda, move semantics', 'Memory: unique/shared pointers, RAII', 'OOP: template classes, function templates, partial specialization', 'Std libs: STL algorithms, functional (bind, function), C++17/20 features', 'Concurrency: thread pools, atomics, lock-free queues', 'HW: protocol stacks, parsing/filtering sensor data, bootloader integration', 'Build: cross-compilation, linker script editing, startup code', 'Debugging: HW breakpoints, test-driven development', 'Architecture: HAL & layered driver-service-app'] },
        { level: 4, items: ['Core: advanced metaprogramming, constexpr, concepts, compile-time programming', 'Memory: custom allocators, memory pools, cache-aware structures, linker scripts', 'OOP: CRTP, SFINAE, concepts, policy-based design', 'Std libs: custom allocators/customization, deep C++20/23 (coroutines, ranges)', 'Concurrency: RTOS integration, scheduling, context switching, real-time tuning', 'HW: firmware architecture, power optimization, watchdogs, interrupt prioritization', 'Build: advanced CMake, memory maps, flash/ROM segmentation, compiler flags', 'Debugging: JTAG/SWD, oscilloscopes, profilers, automated pipelines', 'Architecture: full firmware, distributed systems, safety compliance (MISRA/ISO 26262)'] }
      ]
    },
    {
      title: 'Axivion',
      levels: [
        { level: 1, items: ['Batch run', 'Review reports', 'Fix issues'] },
        { level: 2, items: ['Tool configuration', 'Refine issues (false positives, severity, incremental analysis, trace bugs)'] },
        { level: 3, items: ['Define architecture model (layered, client-server)', 'Verify dependencies', 'Detect cycles/layer violations/illegal access', 'Issue baselines to isolate new violations'] },
        { level: 4, items: ['CI/CD report generation (Git/Jenkins)', 'Compliance (MISRA/AUTOSAR/ISO26262 traceability)'] },
        { level: 5, items: ['Scripting: custom rules (naming, complexity limits)', 'Combine with other tools'] }
      ]
    },
    {
      title: 'MATLAB',
      levels: [
        { level: 1, items: ['Launch MATLAB'] },
        { level: 2, items: ['Configuration & inputs', 'Variable handling', 'Execution'] },
        { level: 3, items: ['Debugging (Simulink)', 'Error simulation', 'M-script execution'] },
        { level: 4, items: ['M-scripting', 'Stateflow debugging', 'Create S-Function'] },
        { level: 5, items: ['Library creation', 'Module implementation'] }
      ]
    },
    {
      title: 'DOORS',
      levels: [
        { level: 1, items: ['UI navigation (modules, views, folders)', 'Toolbar/menus/commands basics'] },
        { level: 2, items: ['Create/edit/manage requirements', 'Link requirements for traceability', 'Use attributes for categorize/filter'] },
        { level: 3, items: ['DB setup/maintenance', 'Import/export data', 'Manage users & permissions'] },
        { level: 4, items: ['Customize views/layouts', 'DXL scripting & automation', 'Reports for coverage/traceability'] },
        { level: 5, items: ['Built-in analysis for gaps/inconsistencies', 'Integrations (IBM Rational, MS Office, etc.)'] }
      ]
    },
    {
      title: 'Azure DevOps',
      levels: [
        { level: 1, items: ['Access & overview of Pipelines and advantages'] },
        { level: 2, items: ['Run pipelines', 'Dashboard analysis', 'Produced/consumed artifacts'] },
        { level: 3, items: ['Debug pipeline errors', 'Know Azure services: Boards, Repos, Pipeline Library'] },
        { level: 4, items: ['Agents, Pools, Stages, Jobs, Builds, Variables', 'Variable groups, PAT, Resources'] },
        { level: 5, items: ['Create pipelines with YAML', 'Full pipeline creation & Azure dashboard administration'] }
      ]
    },
    {
      title: 'Smart Git',
      levels: [
        { level: 1, items: ['Can open Smart Git and perform basic operations like viewing repositories and navigating the tool interface', 'Understand the concept of git version control', 'Can clone a repository', 'Basic knowledge of Git concepts (add, stage, stash, commit, fetch, push, pull) but lacks deeper understanding'] },
        { level: 2, items: ['Branch management', 'Comfortable using Smart Git for basic Git workflows like creating and switching branches, merging, and resolving simple merge conflicts', 'Should know about .git file configuration', 'Good Hands on Git operations (commit, push, fetch, pull, pull requests..etc)', 'Has a basic understanding of how Git works (branching, commits, merges)', 'Understands the concept of merge conflicts and can resolve them with some help', 'Able to know the changes in the commit history itself and understand differences between versions'] },
        { level: 3, items: ['Should expert in branch rebasing b/w multiple task branches or main branch.etc', 'Advanced features like rebase, cherry-pick, or interactive rebasing', 'Understands and can explain how Git handles data (how commits work, SHA-1 hashes, etc.)'] },
        { level: 4, items: ['Can diagnose and resolve issues that arise in project (e.g., complex merge conflicts, history rewrites, etc.)', 'Deep understanding of Git internals, workflows, and advanced features like Git hooks, submodules, and CI/CD integration'] },
        { level: 5, items: ['Expert at troubleshooting and fixing complex Git issues, including history rewrites, reflog, and rebasing across multiple branches', 'Can mentor others, guide teams in setting up version control, and resolve any version control-related conflicts'] }
      ]
    },
    {
      title: 'Integrity',
      levels: [
        { level: 1, items: ['Configuration of Tool', 'Changing status of tasks', 'Attaching reports', 'Updating fields properly'] },
        { level: 2, items: ['Creating filters', 'Creating change requests', 'Spawns to change request', 'Delivery, Build', 'Review checklist creation', 'Creating member links', 'Creating sandboxes'] },
        { level: 3, items: ['Check-in and checkout of documents', 'Performing reviews', 'Tracing changes from Integrity to Source code'] },
        { level: 4, items: ['Generating reports to track progress and identify issues', 'Customizing reports to meet specific stakeholder needs'] },
        { level: 5, items: ['Managing user roles and permissions to ensure secure collaboration', 'Integrating with other PTC products and third party tools like Jira and Microsoft Teams'] }
      ]
    }
  ];

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.fetchDashboardData();
    this.fetchTrainingCatalog();
    this.fetchAssignedTrainingsCount();
  }

  fetchAssignedTrainingsCount(): void {
    // This is a placeholder. In a real app, you would make an API call here.
    // For now, we'll simulate a count.
    this.assignedTrainingsCount = 12; 
  }

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('fade-in-up');
          this.observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1
    });

    this.animatedElements.changes.subscribe((comps: QueryList<ElementRef>) => {
      comps.forEach(el => this.observer.observe(el.nativeElement));
    });
  }

  selectTab(tabName: string): void {
    if (tabName === 'trainingCatalog' || tabName === 'assignTraining' || tabName === 'trainerZone') {
        this.fetchTrainingCatalog();
    }
    this.selectedTeamMember = null;
    this.mySkillsStatusFilter = 'All';
    this.mySkillsSkillFilter = 'All';
    this.teamSkillsStatusFilter = 'All';
    this.teamSkillsSkillFilter = 'All';
    this.teamMemberNameFilter = 'All';
    this.teamCompetencyFilter = 'All';
    this.teamSkillsCurrentLevelFilter = 'All';
    this.activeTab = tabName;
    setTimeout(() => {
        this.animatedElements.forEach(el => this.observer.observe(el.nativeElement));
    }, 0);
  }
  
  openScheduleTrainingModal(): void {
    if (this.manager) {
      this.newTraining.trainer_name = this.manager.name;
    }
    this.showScheduleTrainingModal = true;
  }

  closeScheduleTrainingModal(): void {
    this.showScheduleTrainingModal = false;
    this.newTraining = {
        division: '',
        department: '',
        competency: '',
        skill: '',
        training_name: '',
        training_topics: '',
        prerequisites: '',
        skill_category: 'L1',
        trainer_name: '',
        email: '',
        training_date: '',
        duration: '',
        time: '',
        training_type: 'Online',
        seats: '',
        assessment_details: ''
    };
  }

  // New Modal Methods
  openDetailModal(type: 'mySkillsMet' | 'mySkillGaps' | 'teamSkillsMet' | 'teamSkillGaps' | 'totalMembers' | 'additionalSkills') {
    if (!this.manager) return;
    
    this.modalDataType = null;

    switch(type) {
      case 'totalMembers':
        this.modalTitle = 'Total Team Members';
        this.modalData = this.manager.team;
        this.modalDataType = 'members';
        break;
      case 'mySkillsMet':
        this.modalTitle = 'My Skills Met';
        this.modalData = this.manager.skills.filter(s => s.status === 'Met');
        this.modalDataType = 'skills';
        break;
      case 'mySkillGaps':
        this.modalTitle = 'My Skill Gaps';
        this.modalData = this.manager.skills.filter(s => s.status === 'Gap');
        this.modalDataType = 'skills';
        break;
      case 'teamSkillsMet':
        this.modalTitle = 'Team Skills Met';
        this.modalData = this.manager.team.flatMap(m => m.skills.filter(s => s.status === 'Met').map(s => ({...s, memberName: m.name})));
        this.modalDataType = 'skills';
        break;
      case 'teamSkillGaps':
        this.modalTitle = 'Team Skill Gaps';
        this.modalData = this.manager.team.flatMap(m => m.skills.filter(s => s.status === 'Gap').map(s => ({...s, memberName: m.name})));
        this.modalDataType = 'skills';
        break;
      case 'additionalSkills':
          this.modalTitle = 'My Additional Skills';
          this.modalData = this.additionalSkills;
          this.modalDataType = 'skills'; // Reuse skills template for this
          break;
    }
    this.showDetailModal = true;
  }

  closeDetailModal() {
    this.showDetailModal = false;
    this.modalTitle = '';
    this.modalData = [];
    this.modalDataType = null;
  }


  scheduleTraining(): void {
    const token = this.authService.getToken();
    if (!token) {
        this.errorMessage = 'Authentication error. Please log in again.';
        return;
    }
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

    const payload = {
      division: this.newTraining.division || null,
      department: this.newTraining.department || null,
      training_name: this.newTraining.training_name,
      training_topics: this.newTraining.training_topics,
      prerequisites: this.newTraining.prerequisites,
      skill_category: this.newTraining.skill_category,
      trainer_name: this.newTraining.trainer_name,
      email: this.newTraining.email,
      training_date: this.newTraining.training_date || null,
      duration: this.newTraining.duration,
      time: this.newTraining.time,
      training_type: this.newTraining.training_type,
      seats: this.newTraining.seats,
      assessment_details: this.newTraining.assessment_details
    };

    this.http.post('http://localhost:8000/trainings/', payload, { headers }).subscribe({
        next: (response) => {
            alert('Training scheduled successfully!');
            this.closeScheduleTrainingModal();
            this.fetchTrainingCatalog();
        },
        error: (err) => {
            if (err.status === 422 && err.error && err.error.detail) {
              const errorDetails = err.error.detail.map((e: any) => `- Field '${e.loc[1]}': ${e.msg}`).join('\n');
              const fullErrorMessage = `Please correct the following errors:\n${errorDetails}`;
              this.errorMessage = fullErrorMessage;
              alert(fullErrorMessage);
            } else {
              const detail = err.error?.detail || 'An unknown error occurred. Check the server logs.';
              this.errorMessage = `Failed to schedule training: ${detail}`;
              alert(this.errorMessage);
            }
        }
    });
  }

  fetchTrainingCatalog(): void {
    const token = this.authService.getToken();
    if (!token) {
        return;
    }
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

    this.http.get<TrainingDetail[]>('http://localhost:8000/trainings/', { headers }).subscribe({
      next: (data) => {
        this.trainingCatalog = data;
      },
      error: (err) => {
        this.errorMessage = 'Failed to load training catalog.';
      }
    });
  }

  get filteredCatalog(): TrainingDetail[] {
    let list = [...(this.trainingCatalog || [])];
    if (this.catalogSearch && this.catalogSearch.trim()) {
      const q = this.catalogSearch.trim().toLowerCase();
      list = list.filter(t =>
        (t.training_name || '').toLowerCase().includes(q) ||
        (t.training_topics || '').toLowerCase().includes(q) ||
        (t.trainer_name || '').toLowerCase().includes(q) ||
        (t.skill || '').toLowerCase().includes(q)
      );
    }
    if (this.catalogTypeFilter !== 'All') {
      list = list.filter(t => (t.training_type || '').toLowerCase() === this.catalogTypeFilter.toLowerCase());
    }
    if (this.catalogCategoryFilter !== 'All') {
      list = list.filter(t => (t.skill_category || '').toLowerCase() === this.catalogCategoryFilter.toLowerCase());
    }
    
    list.sort((a, b) => {
      const dateA = a.training_date ? new Date(a.training_date).getTime() : Infinity;
      const dateB = b.training_date ? new Date(b.training_date).getTime() : Infinity;
      return dateA - dateB;
    });
    
    return list;
  }

  get myTrainings(): TrainingDetail[] {
    if (!this.manager) return [];
    return this.trainingCatalog
      .filter(t => t.trainer_name === this.manager?.name)
      .sort((a, b) => {
        const dateA = a.training_date ? new Date(a.training_date).getTime() : 0;
        const dateB = b.training_date ? new Date(b.training_date).getTime() : 0;
        return dateB - dateA; // Sort descending
      });
  }

  isUpcoming(dateStr?: string): boolean {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(dateStr) >= today;
  }

  fetchDashboardData(): void {
    this.isLoading = true;
    const token = this.authService.getToken();
    const userRole = this.authService.getRole();
      
    if (!token || userRole !== 'manager') {
      this.errorMessage = 'Authentication token not found or invalid role. Please log in again.';
      this.isLoading = false;
      this.router.navigate(['/login']);
      return;
    }
      
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

    this.http.get<any>(this.API_ENDPOINT, { headers }).subscribe({
      next: (response) => {
        this.manager = response;
        const anyResp: any = response as any;
        this.managerDisplayName = (anyResp.employee_name && String(anyResp.employee_name).trim())
          || (response.name && String(response.name).trim())
          || (response.id && String(response.id).trim())
          || '';
        this.managerIsTrainer = !!response.manager_is_trainer;
        this.processDashboardData();
        this.extractUniqueMySkills();
        this.extractUniqueTeamSkills();
        this.extractUniqueTeamMembers();
        this.extractUniqueCompetencies();
        this.extractUniqueCurrentLevels();
        this.loadAdditionalSkills();
        this.isLoading = false;
        this.errorMessage = '';
      },
      error: (err) => {
        this.errorMessage = 'Failed to load dashboard data. Please ensure the API is running and the endpoint is correct.';
        console.error('Error fetching data:', err);
        this.isLoading = false;
      }
    });
  }

  processDashboardData(): void {
    if (!this.manager) return;
    this.totalTeamMembers = this.manager.team.length;
    const allTeamSkills = this.manager.team.flatMap((member: TeamMember) => member.skills);
    this.teamSkillsMet = allTeamSkills.filter((skill: Competency) => skill.status === 'Met').length;
    this.teamSkillsGap = allTeamSkills.filter((skill: Competency) => skill.status === 'Gap').length;
    
    const skillGapCount: { [key: string]: number } = {};
    allTeamSkills.forEach((skill: Competency) => {
      if (skill.status === 'Gap') {
        skillGapCount[skill.skill] = (skillGapCount[skill.skill] || 0) + 1;
      }
    });

    this.topSkillGaps = Object.entries(skillGapCount)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3); // Limit to top 3 for a more compact view
  }
  
  extractUniqueMySkills(): void {
    if (this.manager && this.manager.skills) {
      this.uniqueMySkills = [...new Set(this.manager.skills.map(skill => skill.skill))];
    }
  }

  extractUniqueTeamSkills(): void {
    if (this.manager && this.manager.team) {
      const allSkills = this.manager.team.flatMap(member => member.skills.map(skill => skill.skill));
      this.uniqueTeamSkills = [...new Set(allSkills)];
    }
  }

  extractUniqueTeamMembers(): void {
    if (this.manager && this.manager.team) {
      this.uniqueTeamMembers = [...new Set(this.manager.team.map(member => member.name))];
    }
  }

  extractUniqueCompetencies(): void {
    if (this.manager && this.manager.team) {
      const allCompetencies = this.manager.team.flatMap(member =>
        member.skills.map(skill => skill.competency).filter(comp => comp)
      );
      this.uniqueCompetencies = [...new Set(allCompetencies)];
    }
  }

  extractUniqueCurrentLevels(): void {
    if (this.manager && this.manager.team) {
      const allLevels = this.manager.team.flatMap(member =>
        member.skills.map(skill => skill.current_expertise).filter(level => level)
      );
      this.uniqueCurrentLevels = [...new Set(allLevels)];
    }
  }

  assignTraining(): void {
    if (!this.selectedTraining) {
      alert('Please select a training module.');
      return;
    }
    if (!this.selectedMemberId) {
      alert('Please select a team member.');
      return;
    }
    const trainingName = this.trainingCatalog.find(t => t.id === this.selectedTraining)?.training_name;
    const memberName = this.manager?.team.find(m => m.id === this.selectedMemberId)?.name;

    const token = this.authService.getToken();
    if (!token) {
      alert('Authentication token missing. Please login again.');
      return;
    }
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    const payload = { training_id: this.selectedTraining, employee_username: this.selectedMemberId };
    this.http.post('http://localhost:8000/assignments/', payload, { headers }).subscribe({
      next: () => {
        alert(`Assigned "${trainingName}" to ${memberName}`);
        this.selectedTraining = null;
        this.selectedMemberId = null;
      },
      error: (err) => {
        const msg = err.error?.detail || 'Failed to assign training.';
        alert(msg);
      }
    });
  }

  getSelectedTrainingName(): string {
    if (!this.selectedTraining) return '...';
    return this.trainingCatalog.find(t => t.id === this.selectedTraining)?.training_name || '...';
  }

  getSelectedMemberName(): string {
    if (!this.selectedMemberId || !this.manager) return '...';
    return this.manager.team.find(m => m.id === this.selectedMemberId)?.name || '...';
  }

  calculateProgress(skills: Competency[]): number {
    const total = skills.length;
    const met = skills.filter(s => s.status === 'Met').length;
    return total > 0 ? (met / total) * 100 : 0;
  }

  getTeamProgressPercentage(): number {
    const totalSkills = this.manager?.team.flatMap(member => member.skills).length || 0;
    const metSkills = this.manager?.team.flatMap(member => member.skills).filter(skill => skill.status === 'Met').length || 0;
    return totalSkills > 0 ? Math.round((metSkills / totalSkills) * 100) : 0;
  }

  getMySkillsMetCount(): number {
    return this.manager?.skills.filter(skill => skill.status === 'Met').length || 0;
  }

  getSkillProgress(skill: Competency): number {
    const extractLevel = (level: string): number => {
      if (!level) return 0;
      if (level.toUpperCase().startsWith('L')) {
        return parseInt(level.substring(1), 10) || 0;
      }
      const levelMap: { [key: string]: number } = {
        'BEGINNER': 1, 'INTERMEDIATE': 2, 'ADVANCED': 3, 'EXPERT': 4
      };
      return levelMap[level.toUpperCase()] || 0;
    };

    const current = extractLevel(skill.current_expertise);
    const target = extractLevel(skill.target_expertise);

    if (target === 0) return 0;

    let percent = Math.round((current / target) * 100);
    if (percent > 100) percent = 100;
    if (percent < 0) percent = 0;
    return percent;
  }

  getFilteredMySkills(): Competency[] {
    if (!this.manager || !this.manager.skills) {
      return [];
    }
    let filtered = [...this.manager.skills];
    if (this.mySkillsSearch) {
      filtered = filtered.filter(skill =>
        skill.skill.toLowerCase().includes(this.mySkillsSearch.toLowerCase())
      );
    }
    if (this.mySkillsStatusFilter !== 'All') {
      filtered = filtered.filter(skill => skill.status === this.mySkillsStatusFilter);
    }
    if (this.mySkillsSkillFilter !== 'All') {
      filtered = filtered.filter(skill => skill.skill === this.mySkillsSkillFilter);
    }
    return filtered;
  }

  getTeamSkillsMetCount(member: TeamMember): number {
    return member.skills.filter(s => s.status === 'Met').length;
  }

  viewMemberDetails(member: TeamMember): void {
    this.selectedTeamMember = member;
  }

  clearMemberDetails(): void {
    this.selectedTeamMember = null;
    this.cancelEditSkill();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  get filteredTeamMembers(): TeamMember[] {
    if (!this.manager || !this.manager.team) {
      return [];
    }
    let filteredMembers = [...this.manager.team];
    if (this.teamMemberNameFilter !== 'All') {
      filteredMembers = filteredMembers.filter(member => member.name === this.teamMemberNameFilter);
    }
    if (this.teamSkillsStatusFilter !== 'All' || this.teamSkillsSkillFilter !== 'All' || this.teamCompetencyFilter !== 'All' || this.teamSkillsCurrentLevelFilter !== 'All') {
      filteredMembers = filteredMembers.filter(member => {
        return member.skills.some(skill => {
          const statusMatch = this.teamSkillsStatusFilter === 'All' || skill.status === this.teamSkillsStatusFilter;
          const skillMatch = this.teamSkillsSkillFilter === 'All' || skill.skill === this.teamSkillsSkillFilter;
          const competencyMatch = this.teamCompetencyFilter === 'All' || skill.competency === this.teamCompetencyFilter;
          const levelMatch = this.teamSkillsCurrentLevelFilter === 'All' || skill.current_expertise === this.teamSkillsCurrentLevelFilter;
          return statusMatch && skillMatch && competencyMatch && levelMatch;
        });
      });
    }
    return filteredMembers;
  }

  get filteredAssignTrainings(): TrainingDetail[] {
    let list = [...(this.trainingCatalog || [])];
    const q = (this.assignTrainingSearch || '').trim().toLowerCase();
    if (q) {
      list = list.filter(t =>
        (t.training_name || '').toLowerCase().includes(q) ||
        (t.training_topics || '').toLowerCase().includes(q) ||
        (t.trainer_name || '').toLowerCase().includes(q) ||
        (t.training_type || '').toLowerCase().includes(q)
      );
    }
    return list;
  }

  get filteredAssignMembers(): TeamMember[] {
    if (!this.manager || !this.manager.team) return [];
    const q = (this.assignMemberSearch || '').trim().toLowerCase();
    if (!q) return this.manager.team;
    return this.manager.team.filter(m => (m.name || '').toLowerCase().includes(q));
  }

  startEditSkill(memberId: string, skillIndex: number): void {
    const member = this.manager?.team.find(m => m.id === memberId);
    if (member && member.skills[skillIndex]) {
      this.editingSkill = { memberId, skillIndex };
      this.editSkillData = {
        current_expertise: member.skills[skillIndex].current_expertise,
        target_expertise: member.skills[skillIndex].target_expertise
      };
      this.errorMessage = '';
      this.successMessage = '';
    }
  }

  cancelEditSkill(): void {
    this.editingSkill = null;
    this.editSkillData = { current_expertise: '', target_expertise: '' };
  }

  saveSkillEdit(): void {
    if (!this.editingSkill || !this.manager) return;
    const member = this.manager.team.find(m => m.id === this.editingSkill!.memberId);
    if (member && member.skills[this.editingSkill.skillIndex]) {
      const skill = member.skills[this.editingSkill.skillIndex];
      const updateRequest = {
        employee_username: member.id,
        skill_name: skill.skill,
        current_expertise: this.editSkillData.current_expertise,
        target_expertise: this.editSkillData.target_expertise
      };
      const token = this.authService.getToken();
      if (!token) {
        this.errorMessage = 'Authentication token not found. Please login again.';
        return;
      }
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });
      this.http.put('http://localhost:8000/data/manager/team-skill', updateRequest, { headers })
        .subscribe({
          next: (response: any) => {
            skill.current_expertise = response.current_expertise;
            skill.target_expertise = response.target_expertise;
            skill.status = response.status;
            this.processDashboardData();
            this.cancelEditSkill();
            this.successMessage = `Skill "${skill.skill}" updated successfully!`;
            setTimeout(() => { this.successMessage = ''; }, 3000);
          },
          error: (error) => {
            this.errorMessage = 'Failed to update skill. Please try again.';
          }
        });
    }
  }

  isEditingSkill(memberId: string, skillIndex: number): boolean {
    return this.editingSkill?.memberId === memberId && this.editingSkill?.skillIndex === skillIndex;
  }

  // Additional Skills Management
  loadAdditionalSkills(): void {
    const token = this.authService.getToken();
    if (!token) return;
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    this.http.get<any[]>('http://localhost:8000/additional-skills/', { headers }).subscribe({
      next: (skills) => { this.additionalSkills = skills; },
      error: (err) => { this.additionalSkills = []; }
    });
  }

  toggleAddSkillForm(): void {
    this.showAddSkillForm = !this.showAddSkillForm;
    if (!this.showAddSkillForm) {
      this.resetNewSkillForm();
    }
  }

  addNewSkill(): void {
    if (this.newSkill.name.trim()) {
      const token = this.authService.getToken();
      if (!token) return;
      const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
      const skillData = {
        skill_name: this.newSkill.name.trim(),
        skill_level: this.newSkill.level,
        skill_category: this.newSkill.category,
        description: this.newSkill.description.trim() || null
      };
      if (this.editingSkillId) {
        this.http.put<any>(`http://localhost:8000/additional-skills/${this.editingSkillId}`, skillData, { headers }).subscribe({
          next: (updatedSkill) => {
            const index = this.additionalSkills.findIndex(s => s.id === this.editingSkillId);
            if (index !== -1) { this.additionalSkills[index] = updatedSkill; }
            this.resetNewSkillForm();
            this.showAddSkillForm = false;
          },
          error: (err) => { console.error('Failed to update skill:', err); }
        });
      } else {
        this.http.post<any>('http://localhost:8000/additional-skills/', skillData, { headers }).subscribe({
          next: (newSkill) => {
            this.additionalSkills.push(newSkill);
            this.resetNewSkillForm();
            this.showAddSkillForm = false;
          },
          error: (err) => { console.error('Failed to add skill:', err); }
        });
      }
    }
  }

  removeAdditionalSkill(skillId: number): void {
    const token = this.authService.getToken();
    if (!token) return;
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    this.http.delete(`http://localhost:8000/additional-skills/${skillId}`, { headers }).subscribe({
      next: () => { this.additionalSkills = this.additionalSkills.filter(skill => skill.id !== skillId); },
      error: (err) => { console.error('Failed to delete skill:', err); }
    });
  }

  editAdditionalSkill(skill: any): void {
    this.newSkill = {
      name: skill.skill_name,
      level: skill.skill_level,
      category: skill.skill_category,
      description: skill.description || ''
    };
    this.showAddSkillForm = true;
    this.editingSkillId = skill.id;
  }

  resetNewSkillForm(): void {
    this.newSkill = { name: '', level: 'Beginner', category: 'Technical', description: '' };
    this.editingSkillId = null;
  }

  getSkillLevelColor(level: string): string {
    switch (level) {
      case 'Expert': return 'bg-purple-100 text-purple-800';
      case 'Advanced': return 'bg-blue-100 text-blue-800';
      case 'Intermediate': return 'bg-green-100 text-green-800';
      case 'Beginner': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getCategoryColor(category: string): string {
    switch (category) {
      case 'Technical': return 'bg-slate-100 text-slate-700 border border-slate-300';
      case 'Soft Skills': return 'bg-stone-100 text-stone-700 border border-stone-300';
      case 'Leadership': return 'bg-zinc-100 text-zinc-700 border border-zinc-300';
      case 'Communication': return 'bg-neutral-100 text-neutral-700 border border-neutral-300';
      case 'Project Management': return 'bg-gray-100 text-gray-700 border border-gray-300';
      default: return 'bg-gray-100 text-gray-700 border border-gray-300';
    }
  }
  
  // Levels helper methods
  getFilteredSections(): Section[] {
    let sectionsToFilter = this.sections;
    if (this.selectedSkill) {
      sectionsToFilter = this.sections.filter((sec: any) => sec.title === this.selectedSkill);
    }
    const q = this.levelsSearch.trim().toLowerCase();
    if (!q) return sectionsToFilter;

    return sectionsToFilter.map((sec: any) => {
      const matchTitle = sec.title.toLowerCase().includes(q) || (sec.subtitle ?? '').toLowerCase().includes(q);
      const filteredLevels = sec.levels
        .map((l: any) => ({ ...l, items: l.items.filter((it: string) => it.toLowerCase().includes(q)) }))
        .filter((l: any) => l.items.length > 0 || `level ${l.level}`.includes(q));
      if (matchTitle || filteredLevels.length) {
        return { ...sec, levels: matchTitle ? sec.levels : filteredLevels };
      }
      return null;
    }).filter((s: any) => s !== null);
  }

  getLevelHeaderClass = (level: number) => ['bg-red-50', 'bg-orange-50', 'bg-yellow-50', 'bg-indigo-50', 'bg-green-50'][level - 1] || 'bg-gray-50';
  getLevelBadgeClass = (level: number) => ['bg-indigo-500', 'bg-indigo-500', 'bg-indigo-500', 'bg-indigo-500', 'bg-indigo-500'][level - 1] || 'bg-gray-500';
  getLevelTitle = (level: number) => ['Beginner', 'Basic', 'Intermediate', 'Advanced', 'Expert'][level - 1] || 'Unknown';
  getLevelIcon = (level: number) => ['fa-solid fa-seedling text-indigo-500', 'fa-solid fa-leaf text-indigo-500', 'fa-solid fa-tree text-indigo-600', 'fa-solid fa-rocket text-indigo-500', 'fa-solid fa-crown text-indigo-500'][level - 1] || 'fa-solid fa-circle';
  getComplexityDots = (level: number) => Array.from({ length: 5 }, (_, i) => i < level);
  onSkillChange(): void {}
}
