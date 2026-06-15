import * as React from "react";
import { CalendarRange, Check, ClipboardList, Grid2X2, Home, List, Plus, Search, X } from "lucide-react";
import { useAuth } from "../lib/auth";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";
import { Progress } from "../components/ui/progress";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "../components/ui/select";

type Course = {
  id: string;
  code: string;
  title: string;
  credits: number;
  area?: string;
};

type RequirementGroup = {
  id: string;
  title: string;
  note?: string;
  courses: Course[];
  requiredCount?: number;
  areaMinimum?: number;
};

type TrimesterPlan = Record<string, string[]>;
type GradeMap = Record<string, string>;

const TARGET_CREDITS = 137;
const TRIMESTERS = Array.from({ length: 12 }, (_, index) => index + 1);
const RECOMMENDED_TRIMESTER_PLAN: TrimesterPlan = {
  "1": ["ENG 1011", "BDS 1201", "CSE 1110", "MATH 1151"],
  "2": ["ENG 1013", "CSE 1111", "CSE 1112", "CSE 2213"],
  "3": ["MATH 2183", "PHY 2105", "PHY 2106", "CSE 2215", "CSE 2216"],
  "4": ["MATH 2201", "CSE 1325", "CSE 1326", "CSE 1115", "CSE 1116"],
  "5": ["MATH 2205", "SOC 2101", "CSE 2217", "CSE 2218", "EEE 2113"],
  "6": ["CSE 3521", "CSE 3522", "EEE 2123", "EEE 2124", "CSE 4165"],
  "7": ["CSE 3313", "CSE 2118", "BIO 3105", "CSE 3411", "CSE 3412"],
  "8": ["CSE 4325", "CSE 4326", "CSE 3421", "CSE 3422", "CSE 3811", "CSE 3812"],
  "9": ["CSE 2233", "ECO 4101", "PMG 4101", "CSE 3711", "CSE 3712"],
  "10": ["SOC 4101", "CSE 4000A", "CSE 4889-Data Science", "CSE 4509", "CSE 4510"],
  "11": ["ACT 2111", "CSE 4891-Data Science", "CSE 4883-Data Science", "CSE 4000B", "CSE 4531"],
  "12": ["CSE 4000C", "EEE 4261", "CSE 4451-Software Engineering", "CSE 4587-Systems"],
};

const PREREQUISITES: Record<string, string> = {
  "ENG 1013": "ENG 1011",
  "CSE 1111": "CSE 1110",
  "CSE 1112": "CSE 1110",
  "MATH 2183": "MATH 1151",
  "CSE 2215": "CSE 1111",
  "CSE 2216": "CSE 1112",
  "MATH 2201": "MATH 1151",
  "CSE 1115": "CSE 2215",
  "CSE 1116": "CSE 2216",
  "MATH 2205": "MATH 1151",
  "CSE 2217": "CSE 2215",
  "CSE 2218": "CSE 2216",
  "EEE 2123": "EEE 2113",
  "CSE 4165": "CSE 2118",
  "CSE 4181": "CSE 2118",
  "CSE 3313": "CSE 1325",
  "CSE 4325": "CSE 3313",
  "CSE 3421": "CSE 3411",
  "CSE 3422": "CSE 3412",
  "CSE 3811": "MATH 2205",
  "PMG 4101": "CSE 3411",
  "CSE 4000B": "CSE 4000A",
  "CSE 4531": "CSE 3711",
  "CSE 4000C": "CSE 4000A, CSE 4000B",
  "CSE 4621": "MATH 2183, MATH 2201",
  "CSE 4523": "MATH 2205",
  "CSE 4889": "CSE 3811",
  "CSE 4891": "CSE 3811",
  "CSE 4883": "CSE 4889",
  "CSE 4495": "CSE 3421",
  "CSE 4329": "CSE 3313",
  "CSE 4633": "CSE 2217, CSE 2213",
};

const LAB_COURSE_CODES = new Set([
  "CSE 1110",
  "CSE 1112",
  "CSE 2216",
  "CSE 2218",
  "CSE 1326",
  "CSE 1116",
  "EEE 2124",
  "CSE 3522",
  "CSE 2118",
  "CSE 3412",
  "CSE 4326",
  "CSE 3422",
  "CSE 3812",
  "CSE 3712",
  "CSE 4510",
  "PHY 2106",
]);

const c = (code: string, title: string, credits: number, area?: string): Course => ({
  id: area ? `${code}-${area}` : code,
  code,
  title,
  credits,
  area,
});

const GROUPS: RequirementGroup[] = [
  {
    id: "language",
    title: "Language",
    courses: [
      c("ENG 1011", "Intensive English I", 3),
      c("ENG 1013", "Intensive English II", 3),
    ],
  },
  {
    id: "general-required",
    title: "General Education - Compulsory",
    courses: [
      c("SOC 2101", "Society, Environment and Engineering Ethics", 3),
      c("PMG 4101", "Project Management", 3),
      c("BDS 1201", "History of the Emergence of Bangladesh", 2),
    ],
  },
  {
    id: "general-optional",
    title: "General Education - Optional",
    note: "Complete any 2 courses.",
    requiredCount: 2,
    courses: [
      c("ECO 4101", "Economics", 3),
      c("SOC 4101", "Introduction to Sociology", 3),
      c("ACT 2111", "Financial and Managerial Accounting", 3),
      c("IPE 3401", "Industrial and Operational Management", 3),
      c("TEC 2499", "Technology Entrepreneurship", 3),
      c("PSY 2101", "Psychology", 3),
      c("BDS 2201", "Bangladesh Studies", 3),
      c("BAN 2501", "Bangla", 3),
    ],
  },
  {
    id: "basic-sciences",
    title: "Basic Sciences",
    courses: [
      c("PHY 2105", "Physics", 3),
      c("PHY 2106", "Physics Laboratory", 1),
      c("BIO 3105", "Biology for Engineers", 3),
    ],
  },
  {
    id: "mathematics",
    title: "Mathematics",
    courses: [
      c("MATH 1151", "Fundamental Calculus", 3),
      c("MATH 2183", "Calculus and Linear Algebra", 3),
      c("MATH 2201", "Coordinate Geometry and Vector Analysis", 3),
      c("MATH 2205", "Probability and Statistics", 3),
    ],
  },
  {
    id: "other-engineering",
    title: "Other Engineering",
    courses: [
      c("EEE 2113", "Electrical Circuits", 3),
      c("EEE 2123", "Electronics", 3),
      c("EEE 2124", "Electronics Laboratory", 1),
      c("EEE 4261", "Green Computing", 3),
    ],
  },
  {
    id: "programming-required",
    title: "Programming - Compulsory",
    courses: [
      c("CSE 1110", "Introduction to Computer Systems", 1),
      c("CSE 1111", "Structured Programming Language", 3),
      c("CSE 1112", "Structured Programming Language Laboratory", 1),
      c("CSE 1115", "Object Oriented Programming", 3),
      c("CSE 1116", "Object Oriented Programming Laboratory", 1),
      c("CSE 2118", "Advanced Object Oriented Programming Lab", 1),
    ],
  },
  {
    id: "programming-optional",
    title: "Programming - Optional",
    note: "Complete any 1 course.",
    requiredCount: 1,
    courses: [
      c("CSE 4165", "Web Programming", 3),
      c("CSE 4181", "Mobile Application Development", 3),
    ],
  },
  {
    id: "hardware-core",
    title: "Hardware",
    courses: [
      c("CSE 1325", "Digital Logic Design", 3),
      c("CSE 1326", "Digital Logic Design Laboratory", 1),
      c("CSE 3313", "Computer Architecture", 3),
      c("CSE 4325", "Microprocessors and Microcontrollers", 3),
      c("CSE 4326", "Microprocessors and Microcontrollers Laboratory", 1),
    ],
  },
  {
    id: "logic-algorithms",
    title: "Logics and Algorithms",
    courses: [
      c("CSE 2213", "Discrete Mathematics", 3),
      c("CSE 2215", "Data Structure and Algorithms I", 3),
      c("CSE 2216", "Data Structure and Algorithms I Laboratory", 1),
      c("CSE 2217", "Data Structure and Algorithms II", 3),
      c("CSE 2218", "Data Structure and Algorithms II Laboratory", 1),
      c("CSE 2233", "Theory of Computation", 3),
    ],
  },
  {
    id: "software-engineering-core",
    title: "Software Engineering",
    courses: [
      c("CSE 3411", "System Analysis and Design", 3),
      c("CSE 3412", "System Analysis and Design Laboratory", 1),
      c("CSE 3421", "Software Engineering", 3),
      c("CSE 3422", "Software Engineering Laboratory", 1),
    ],
  },
  {
    id: "systems-core",
    title: "Systems",
    courses: [
      c("CSE 4531", "Computer Security", 3),
      c("CSE 3521", "Database Management Systems", 3),
      c("CSE 3522", "Database Management Systems Laboratory", 1),
      c("CSE 4509", "Operating Systems", 3),
      c("CSE 4510", "Operating Systems Laboratory", 1),
      c("CSE 3711", "Computer Networks", 3),
      c("CSE 3712", "Computer Networks Laboratory", 1),
      c("CSE 3811", "Artificial Intelligence", 3),
      c("CSE 3812", "Artificial Intelligence Laboratory", 1),
    ],
  },
  {
    id: "electives",
    title: "Elective Courses",
    note: "Complete any 5 courses, with at least 3 from one area.",
    requiredCount: 5,
    areaMinimum: 3,
    courses: [
      c("CSE 4601", "Mathematical Analysis for Computer Science", 3, "Computational Theory"),
      c("CSE 4633", "Basic Graph Theory", 3, "Computational Theory"),
      c("CSE 4655", "Algorithm Engineering", 3, "Computational Theory"),
      c("CSE 4611", "Compiler Design", 3, "Computational Theory"),
      c("CSE 4613", "Computational Geometry", 3, "Computational Theory"),
      c("CSE 4621", "Computer Graphics", 3, "Computational Theory"),
      c("CSE 3715", "Data Communication", 3, "Network and Communications"),
      c("CSE 4759", "Wireless and Cellular Communication", 3, "Network and Communications"),
      c("CSE 4793", "Advanced Network Services and Management", 3, "Network and Communications"),
      c("CSE 4783", "Cryptography", 3, "Network and Communications"),
      c("CSE 4777", "Networks Security", 3, "Network and Communications"),
      c("CSE 4763", "Electronic Business", 3, "Network and Communications"),
      c("CSE 4547", "Multimedia Systems Design", 3, "Systems"),
      c("CSE 4519", "Distributed Systems", 3, "Systems"),
      c("CSE 4523", "Simulation and Modeling", 3, "Systems"),
      c("CSE 4521", "Computer Graphics", 3, "Systems"),
      c("CSE 4587", "Cloud Computing", 3, "Systems"),
      c("CSE 4567", "Advanced Database Management Systems", 3, "Systems"),
      c("CSE 4889", "Machine Learning", 3, "Data Science"),
      c("CSE 4891", "Data Mining", 3, "Data Science"),
      c("CSE 4893", "Introduction to Bioinformatics", 3, "Data Science"),
      c("CSE 4883", "Digital Image Processing", 3, "Data Science"),
      c("CSE 4817", "Big Data Analytics", 3, "Data Science"),
      c("CSE 4451", "Human Computer Interaction", 3, "Software Engineering"),
      c("CSE 4435", "Software Architecture", 3, "Software Engineering"),
      c("CSE 4165", "Web Programming", 3, "Software Engineering"),
      c("CSE 4181", "Mobile Application Development", 3, "Software Engineering"),
      c("CSE 4495", "Software Testing and Quality Assurance", 3, "Software Engineering"),
      c("CSE 4485", "Game Design and Development", 3, "Software Engineering"),
      c("CSE 4329", "Digital System Design", 3, "Hardware"),
      c("CSE 4379", "Real-time Embedded Systems", 3, "Hardware"),
      c("CSE 4327", "VLSI Design", 3, "Hardware"),
      c("CSE 4337", "Robotics", 3, "Hardware"),
      c("CSE 4397", "Interfacing", 3, "Hardware"),
      c("CSE 4941", "Enterprise Systems: Concepts and Practice", 3, "Information and Communication Technology"),
      c("CSE 4943", "Web Application Security", 3, "Information and Communication Technology"),
      c("CSE 4463", "Electronic Business", 3, "Information and Communication Technology"),
      c("CSE 4165", "Web Programming", 3, "Information and Communication Technology"),
      c("CSE 4181", "Mobile Application Development", 3, "Information and Communication Technology"),
      c("CSE 4945", "UI: Concepts and Design", 3, "Information and Communication Technology"),
      c("CSE 4949", "IT Audit: Concepts and Practice", 3, "Information and Communication Technology"),
      c("CSE 4587", "Cloud Computing", 3, "Information and Communication Technology"),
      c("CSE 4495", "Software Testing and Quality Assurance", 3, "Information and Communication Technology"),
    ],
  },
  {
    id: "university-required",
    title: "University Required",
    courses: [c("URC 1103", "Life Skills for Success", 2)],
  },
  {
    id: "final-year-design",
    title: "Final Year Design Project",
    courses: [
      c("CSE 4000A", "Final Year Design Project - I", 2),
      c("CSE 4000B", "Final Year Design Project - II", 2),
      c("CSE 4000C", "Final Year Design Project - III", 2),
    ],
  },
];

function requiredCount(group: RequirementGroup) {
  return group.requiredCount ?? group.courses.length;
}

function completedCourses(group: RequirementGroup, completed: Set<string>) {
  return group.courses.filter((course) => completed.has(course.id));
}

function creditedCourses(group: RequirementGroup, completed: Set<string>) {
  return completedCourses(group, completed).slice(0, requiredCount(group));
}

function groupStats(group: RequirementGroup, completed: Set<string>) {
  const done = completedCourses(group, completed);
  const needed = requiredCount(group);
  const areaCounts = done.reduce<Record<string, number>>((acc, course) => {
    if (course.area) acc[course.area] = (acc[course.area] ?? 0) + 1;
    return acc;
  }, {});
  const strongestArea = Object.entries(areaCounts).sort((a, b) => b[1] - a[1])[0];
  const areaSatisfied = !group.areaMinimum || Object.values(areaCounts).some((count) => count >= group.areaMinimum);
  const countSatisfied = done.length >= needed;
  return {
    done,
    needed,
    credited: creditedCourses(group, completed),
    missingCount: Math.max(0, needed - done.length),
    isComplete: countSatisfied && areaSatisfied,
    areaSatisfied,
    strongestArea,
  };
}

function creditedCredits(completed: Set<string>) {
  return GROUPS.reduce((sum, group) => {
    return sum + creditedCourses(group, completed).reduce((courseSum, course) => courseSum + course.credits, 0);
  }, 0);
}

function requirementTotal() {
  return GROUPS.reduce((sum, group) => sum + requiredCount(group), 0);
}

function allCourses() {
  return GROUPS.flatMap((group) => group.courses.map((course) => ({ ...course, groupTitle: group.title })));
}

function courseMap() {
  return new Map(allCourses().map((course) => [course.id, course]));
}

function cloneRecommendedPlan() {
  return Object.fromEntries(Object.entries(RECOMMENDED_TRIMESTER_PLAN).map(([trimester, ids]) => [trimester, [...ids]]));
}

function prerequisiteFor(course: Course) {
  return PREREQUISITES[course.id] ?? PREREQUISITES[course.code];
}

function prerequisiteCodes(prerequisite: string) {
  return prerequisite.match(/[A-Z]{2,4}\s?\d{4}[A-Z]?/g) ?? [];
}

function isLabCourse(course: Course) {
  return LAB_COURSE_CODES.has(course.code) || /lab(oratory)?/i.test(course.title);
}

export default function CoursePlanner() {
  const { user } = useAuth();
  const storageKey = `alink:course-planner:${user?.id ?? "guest"}`;
  const trimesterStorageKey = `alink:course-planner-trimesters:${user?.id ?? "guest"}`;
  const gradesStorageKey = `alink:course-planner-grades:${user?.id ?? "guest"}`;
  const [completedIds, setCompletedIds] = React.useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [trimesterPlan, setTrimesterPlan] = React.useState<TrimesterPlan>(() => {
    try {
      const raw = localStorage.getItem(trimesterStorageKey);
      return raw ? JSON.parse(raw) : cloneRecommendedPlan();
    } catch {
      return cloneRecommendedPlan();
    }
  });
  const [auditQuery, setAuditQuery] = React.useState("");
  const [plannerView, setPlannerView] = React.useState<"home" | "trimesters" | "all">("home");
  const [grades, setGrades] = React.useState<GradeMap>(() => {
    try {
      const raw = localStorage.getItem(gradesStorageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const completed = React.useMemo(() => new Set(completedIds), [completedIds]);
  const coursesById = React.useMemo(() => courseMap(), []);

  React.useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(completedIds));
    } catch {}
  }, [completedIds, storageKey]);

  React.useEffect(() => {
    try {
      localStorage.setItem(trimesterStorageKey, JSON.stringify(trimesterPlan));
    } catch {}
  }, [trimesterPlan, trimesterStorageKey]);

  React.useEffect(() => {
    try {
      localStorage.setItem(gradesStorageKey, JSON.stringify(grades));
    } catch {}
  }, [grades, gradesStorageKey]);

  const normalizedQuery = auditQuery.trim().toLowerCase();
  const visibleGroups = normalizedQuery
    ? GROUPS.map((group) => ({
        ...group,
        courses: group.courses.filter((course) =>
          `${course.code} ${course.title} ${course.area ?? ""}`.toLowerCase().includes(normalizedQuery),
        ),
      })).filter((group) => group.courses.length > 0)
    : GROUPS;

  const toggleCourse = (courseId: string, checked: boolean) => {
    setCompletedIds((ids) => checked ? Array.from(new Set([...ids, courseId])) : ids.filter((id) => id !== courseId));
  };

  const setCourseGrade = (courseId: string, value: string) => {
    setGrades((current) => {
      if (value === "") {
        const { [courseId]: _removed, ...rest } = current;
        return rest;
      }
      if (!/^(?:[0-3](?:\.\d{0,2})?|4(?:\.0{0,2})?)$/.test(value)) return current;
      return { ...current, [courseId]: value };
    });
  };

  const addCourseToTrimester = (trimester: number, courseId: string) => {
    setTrimesterPlan((plan) => {
      const key = String(trimester);
      const current = plan[key] ?? [];
      if (current.includes(courseId)) return plan;
      return { ...plan, [key]: [...current, courseId] };
    });
  };

  const removeCourseFromTrimester = (trimester: number, courseId: string) => {
    setTrimesterPlan((plan) => {
      const key = String(trimester);
      return { ...plan, [key]: (plan[key] ?? []).filter((id) => id !== courseId) };
    });
  };

  const loadRecommendedPlan = () => setTrimesterPlan(cloneRecommendedPlan());
  const completedCredits = creditedCredits(completed);
  const overallProgress = Math.min(100, Math.round((completedCredits / TARGET_CREDITS) * 100));
  const completedRequirementCount = GROUPS.reduce((sum, group) => sum + Math.min(completedCourses(group, completed).length, requiredCount(group)), 0);
  const totalRequirements = requirementTotal();
  const plannedTrimesters = Object.values(trimesterPlan).filter((ids) => ids.length > 0).length;

  if (plannerView === "home") {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-border bg-gradient-to-br from-background via-card to-muted/60 p-6 md:p-8">
          <Badge variant="outline" className="rounded-full mb-3">
            <ClipboardList className="size-3" /> CSE course planner
          </Badge>
          <h1 className="font-serif text-4xl md:text-5xl">Course planner</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Choose how you want to work with your CSE courses.</p>
          <div className="mt-6 max-w-2xl">
            <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
              <span>Overall progress</span>
              <span>{completedCredits} / {TARGET_CREDITS} credits · {overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-3" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <PlannerChoiceCard
            icon={CalendarRange}
            title="Trimesters"
            description="Plan by Trimester 1-12, enter CGPA, and mark courses complete."
            action="Open trimesters"
            onClick={() => setPlannerView("trimesters")}
          />
          <PlannerChoiceCard
            icon={ClipboardList}
            title="All courses"
            description="View every course, optional choices, and elective area barriers."
            action="View all courses"
            onClick={() => setPlannerView("all")}
          />
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground">Progress</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-muted/50 p-3 text-center">
                  <div className="font-serif text-2xl">{completedCredits}</div>
                  <div className="text-xs text-muted-foreground">Credits</div>
                </div>
                <div className="rounded-2xl bg-muted/50 p-3 text-center">
                  <div className="font-serif text-2xl">{completedRequirementCount}/{totalRequirements}</div>
                  <div className="text-xs text-muted-foreground">Courses</div>
                </div>
                <div className="rounded-2xl bg-muted/50 p-3 text-center">
                  <div className="font-serif text-2xl">{plannedTrimesters}/12</div>
                  <div className="text-xs text-muted-foreground">Terms</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (plannerView === "all") {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <Button variant="outline" onClick={() => setPlannerView("home")}>
              Back
            </Button>
            <div>
              <div className="font-serif text-3xl">All courses</div>
              <p className="text-sm text-muted-foreground">Full CSE audit with elective area barriers.</p>
            </div>
          </div>
          <div className="relative md:max-w-md md:flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={auditQuery} onChange={(event) => setAuditQuery(event.target.value)} placeholder="Search all courses" className="pl-9" />
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {visibleGroups.map((group) => (
            <RequirementCard key={group.id} group={group} completed={completed} onToggle={toggleCourse} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TrimesterPlanner
        completed={completed}
        coursesById={coursesById}
        plan={trimesterPlan}
        onAdd={addCourseToTrimester}
        onRemove={removeCourseFromTrimester}
        onToggleComplete={toggleCourse}
        onLoadRecommended={loadRecommendedPlan}
        onBack={() => setPlannerView("home")}
        grades={grades}
        onGradeChange={setCourseGrade}
      />

    </div>
  );
}

function PlannerChoiceCard({
  icon: Icon,
  title,
  description,
  action,
  onClick,
}: {
  icon: any;
  title: string;
  description: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="size-12 rounded-2xl bg-primary/10 text-primary grid place-items-center">
          <Icon className="size-5" />
        </div>
        <div className="mt-4 font-serif text-3xl">{title}</div>
        <p className="mt-2 min-h-12 text-sm text-muted-foreground">{description}</p>
        <Button onClick={onClick} className="mt-5 w-full">{action}</Button>
      </CardContent>
    </Card>
  );
}

function RequirementCard({
  group,
  completed,
  onToggle,
}: {
  group: RequirementGroup;
  completed: Set<string>;
  onToggle: (courseId: string, checked: boolean) => void;
}) {
  const stats = groupStats(group, completed);
  const percent = Math.min(100, Math.round((stats.done.length / stats.needed) * 100));
  const countLabel = group.requiredCount ? `${Math.min(stats.done.length, stats.needed)} / ${stats.needed} selected` : `${stats.done.length} / ${stats.needed} done`;
  const coursesByArea = group.id === "electives"
    ? group.courses.reduce<Record<string, Course[]>>((acc, course) => {
        const area = course.area ?? "Electives";
        acc[area] = [...(acc[area] ?? []), course];
        return acc;
      }, {})
    : null;

  return (
    <Card className={stats.isComplete ? "border-primary/40" : ""}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="font-serif text-2xl">{group.title}</CardTitle>
            {group.note && <p className="text-sm text-muted-foreground mt-1">{group.note}</p>}
          </div>
          <Badge variant={stats.isComplete ? "default" : "outline"} className="rounded-full">
            {stats.isComplete ? "Complete" : countLabel}
          </Badge>
        </div>
        <Progress value={percent} className="h-1.5 mt-3" />
        {group.areaMinimum && (
          <div className="text-xs text-muted-foreground mt-2">
            Area rule: {stats.areaSatisfied ? `met by ${stats.strongestArea?.[0]}` : `${stats.areaMinimum} courses from one area needed`}
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {coursesByArea ? (
          <div className="space-y-4">
            {Object.entries(coursesByArea).map(([area, courses]) => {
              const areaDone = courses.filter((course) => completed.has(course.id)).length;
              return (
                <div key={area} className="rounded-2xl border border-border overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/50 px-4 py-3">
                    <div className="font-medium">{area}</div>
                    <Badge variant={areaDone >= (group.areaMinimum ?? 3) ? "default" : "outline"} className="rounded-full">
                      {areaDone} selected
                    </Badge>
                  </div>
                  <div className="divide-y divide-border px-4">
                    {courses.map((course) => (
                      <CourseCheckRow key={course.id} course={course} checked={completed.has(course.id)} onToggle={onToggle} hideArea />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {group.courses.map((course) => (
              <CourseCheckRow key={course.id} course={course} checked={completed.has(course.id)} onToggle={onToggle} />
            ))}
          </div>
        )}
        {stats.missingCount > 0 && (
          <div className="mt-3 text-sm text-muted-foreground">
            Remaining: {stats.missingCount} {stats.missingCount === 1 ? "course" : "courses"} in this section.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CourseCheckRow({
  course,
  checked,
  onToggle,
  hideArea,
}: {
  course: Course;
  checked: boolean;
  onToggle: (courseId: string, checked: boolean) => void;
  hideArea?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 py-3">
      <Checkbox checked={checked} onCheckedChange={(value) => onToggle(course.id, value === true)} className="mt-1" />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{course.code}</span>
          <span className={checked ? "text-muted-foreground line-through" : ""}>{course.title}</span>
        </span>
        <span className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>{course.credits} credits</span>
          {course.area && !hideArea && <span>{course.area}</span>}
        </span>
      </span>
    </label>
  );
}

function TrimesterPlanner({
  completed,
  coursesById,
  plan,
  onAdd,
  onRemove,
  onToggleComplete,
  onLoadRecommended,
  onBack,
  grades,
  onGradeChange,
}: {
  completed: Set<string>;
  coursesById: Map<string, Course & { groupTitle: string }>;
  plan: TrimesterPlan;
  onAdd: (trimester: number, courseId: string) => void;
  onRemove: (trimester: number, courseId: string) => void;
  onToggleComplete: (courseId: string, checked: boolean) => void;
  onLoadRecommended: () => void;
  onBack: () => void;
  grades: GradeMap;
  onGradeChange: (courseId: string, value: string) => void;
}) {
  const [activeTrimester, setActiveTrimester] = React.useState(1);
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState("All Courses");
  const [sort, setSort] = React.useState("default");
  const [view, setView] = React.useState<"list" | "grid">("list");
  const groupedCourses = React.useMemo(() => GROUPS.map((group) => ({
    title: group.title,
    courses: group.courses,
  })), []);
  const completedCourseCodes = React.useMemo(() => {
    return new Set(Array.from(completed).map((id) => coursesById.get(id)?.code).filter(Boolean) as string[]);
  }, [completed, coursesById]);

  const ids = plan[String(activeTrimester)] ?? [];
  const courses = ids.map((id) => coursesById.get(id)).filter(Boolean) as Array<Course & { groupTitle: string }>;
  const credits = courses.reduce((sum, course) => sum + course.credits, 0);
  const gradedCourses = courses
    .map((course) => ({ course, grade: Number(grades[course.id]) }))
    .filter(({ grade }) => !Number.isNaN(grade));
  const gradedCredits = gradedCourses.reduce((sum, item) => sum + item.course.credits, 0);
  const termCgpa = gradedCredits
    ? (gradedCourses.reduce((sum, item) => sum + item.grade * item.course.credits, 0) / gradedCredits).toFixed(2)
    : "-";
  const completedCount = courses.filter((course) => completed.has(course.id)).length;
  const completionPercent = courses.length ? Math.round((completedCount / courses.length) * 100) : 0;
  const labCredits = courses.filter(isLabCourse).reduce((sum, course) => sum + course.credits, 0);
  const theoryCredits = credits - labCredits;
  const previousCourseCodes = new Set(
    TRIMESTERS
      .filter((item) => item < activeTrimester)
      .flatMap((item) => plan[String(item)] ?? [])
      .map((id) => coursesById.get(id)?.code)
      .filter(Boolean) as string[],
  );
  const plannedInOtherTrimesters = new Set(
    Object.entries(plan)
      .filter(([key]) => key !== String(activeTrimester))
      .flatMap(([, plannedIds]) => plannedIds),
  );
  const availableCourses = groupedCourses.map((group) => ({
    ...group,
    courses: group.courses.filter((course) => !ids.includes(course.id) && !plannedInOtherTrimesters.has(course.id)),
  }));
  const categories = ["All Courses", ...Array.from(new Set(courses.map(categoryForCourse)))];
  const visibleCourses = courses
    .filter((course) => filter === "All Courses" || categoryForCourse(course) === filter)
    .filter((course) => `${course.code} ${course.title} ${categoryForCourse(course)}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => {
      if (sort === "code") return a.code.localeCompare(b.code);
      if (sort === "credits") return b.credits - a.credits;
      return ids.indexOf(a.id) - ids.indexOf(b.id);
    });

  const markAll = () => courses.forEach((course) => onToggleComplete(course.id, true));
  const clearTerm = () => courses.forEach((course) => onToggleComplete(course.id, false));

  return (
    <section className="space-y-5">
      <div className="rounded-3xl border border-border bg-card p-5 md:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to course planner"
              className="size-12 shrink-0 rounded-2xl border border-blue-200 bg-blue-50 text-blue-600 grid place-items-center transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              <Home className="size-5" />
            </button>
            <div className="min-w-0">
              <Badge variant="outline" className="rounded-full mb-2">
                <ClipboardList className="size-3" /> CSE course planner
              </Badge>
              <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
                <h1 className="font-serif text-4xl">Trimester {activeTrimester}</h1>
                <span className="pb-1 text-sm text-muted-foreground">of 12</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary" className="rounded-full">{courses.length} courses</Badge>
                <Badge variant="secondary" className="rounded-full">{credits} credits</Badge>
                <Badge variant="secondary" className="rounded-full">{theoryCredits} theory</Badge>
                <Badge variant="secondary" className="rounded-full">{labCredits} lab</Badge>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center xl:justify-end">
            <div className="flex w-full items-center rounded-2xl border border-border bg-muted/40 p-1 sm:w-auto">
              <Button variant={view === "list" ? "default" : "ghost"} size="icon" onClick={() => setView("list")} aria-label="List view" className="rounded-xl">
                <List className="size-4" />
              </Button>
              <Button variant={view === "grid" ? "default" : "ghost"} size="icon" onClick={() => setView("grid")} aria-label="Grid view" className="rounded-xl">
                <Grid2X2 className="size-4" />
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value="choose" onValueChange={(value) => value !== "choose" && onAdd(activeTrimester, value)}>
                <SelectTrigger className="h-11 w-[170px] border-green-200 bg-green-50 text-green-700">
                  <Plus className="size-4" />
                  <SelectValue placeholder="Add course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="choose" disabled>Add course</SelectItem>
                  {availableCourses.map((group) => (
                    <SelectGroup key={group.title}>
                      <SelectLabel>{group.title}</SelectLabel>
                      {group.courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.code} - {course.title}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={markAll} className="h-11">
                <Check className="size-4" /> All
              </Button>
              <Button variant="outline" onClick={clearTerm} className="h-11">
                <X className="size-4" /> Clear
              </Button>
              <Button variant="ghost" onClick={onLoadRecommended} className="h-11 text-muted-foreground">
                <CalendarRange className="size-4" /> Default
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 md:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="outline" disabled={activeTrimester === 1} onClick={() => setActiveTrimester((value) => Math.max(1, value - 1))} className="h-12 sm:min-w-44">
              Previous
            </Button>
            <div className="rounded-full bg-muted px-4 py-2 text-center text-sm font-medium text-muted-foreground">Trimester {activeTrimester} of 12</div>
            <Button variant="outline" disabled={activeTrimester === 12} onClick={() => setActiveTrimester((value) => Math.min(12, value + 1))} className="h-12 sm:min-w-44">
              Next
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <TermStat value={`${credits}`} label="Total Credits" tone="text-blue-600" />
        <TermStat value={`${completedCount}`} label="Completed" tone="text-green-600" />
        <TermStat value={termCgpa} label="Term CGPA" tone="text-amber-500" />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-muted-foreground">{completedCount} of {courses.length} courses completed</span>
          <span className="font-semibold">{completionPercent}%</span>
        </div>
        <Progress value={completionPercent} className="h-2 bg-muted" />
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Button key={category} variant={filter === category ? "default" : "outline"} className="rounded-full" onClick={() => setFilter(category)}>
            {category !== "All Courses" && <span className={`size-2 rounded-full ${categoryDot(category)}`} />}
            {category}
          </Button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_190px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search courses by name or code..." className="h-12 pl-9" />
          {query && (
            <Button variant="ghost" size="icon" onClick={() => setQuery("")} className="absolute right-1 top-1/2 -translate-y-1/2">
              <X className="size-4" />
            </Button>
          )}
        </div>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="h-12">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default Order</SelectItem>
            <SelectItem value="code">Course Code</SelectItem>
            <SelectItem value="credits">Credit Hours</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className={view === "grid" ? "grid gap-4 md:grid-cols-2" : "space-y-3"}>
        {visibleCourses.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">No courses match this view.</CardContent>
          </Card>
        )}
        {visibleCourses.map((course) => {
          const prerequisite = prerequisiteFor(course);
          const missingPrerequisites = prerequisite
            ? prerequisiteCodes(prerequisite).filter((code) => !completedCourseCodes.has(code) && !previousCourseCodes.has(code))
            : [];
          return (
            <TermCourseRow
              key={course.id}
              course={course}
              checked={completed.has(course.id)}
              prerequisite={prerequisite}
              missingPrerequisites={missingPrerequisites}
              onToggle={onToggleComplete}
              onRemove={() => onRemove(activeTrimester, course.id)}
              grade={grades[course.id] ?? ""}
              onGradeChange={onGradeChange}
            />
          );
        })}
      </div>
    </section>
  );
}

function TermStat({ value, label, tone }: { value: string; label: string; tone: string }) {
  return (
    <Card>
      <CardContent className="p-6 text-center">
        <div className={`font-serif text-4xl ${tone}`}>{value}</div>
        <div className="mt-2 text-sm text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

function TermCourseRow({
  course,
  checked,
  prerequisite,
  missingPrerequisites,
  onToggle,
  onRemove,
  grade,
  onGradeChange,
}: {
  course: Course & { groupTitle: string };
  checked: boolean;
  prerequisite?: string;
  missingPrerequisites: string[];
  onToggle: (courseId: string, checked: boolean) => void;
  onRemove: () => void;
  grade: string;
  onGradeChange: (courseId: string, value: string) => void;
}) {
  const category = categoryForCourse(course);
  return (
    <Card className="overflow-hidden">
      <CardContent className="relative p-0">
        <div className={`absolute inset-y-0 left-0 w-1.5 ${categoryBar(category)}`} />
        <div className="flex flex-col gap-4 p-5 pl-7 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <Checkbox checked={checked} onCheckedChange={(value) => onToggle(course.id, value === true)} className="mt-1 size-5 rounded-md" />
            <div className="min-w-0 flex-1">
            <div className="font-semibold text-muted-foreground">{course.code}</div>
            <div className={`font-serif text-xl ${checked ? "text-muted-foreground line-through" : ""}`}>{course.title}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="secondary" className="rounded-full">{category}</Badge>
              <Badge className="rounded-full bg-blue-100 text-blue-700 hover:bg-blue-100">{isLabCourse(course) ? "Lab" : "Theory"}</Badge>
              {course.area && <Badge variant="outline" className="rounded-full">{course.area}</Badge>}
            </div>
            {prerequisite && (
              <div className={missingPrerequisites.length ? "mt-2 text-xs text-destructive" : "mt-2 text-xs text-muted-foreground"}>
                Prerequisite: {prerequisite}{missingPrerequisites.length ? ` · missing ${missingPrerequisites.join(", ")}` : ""}
              </div>
            )}
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 lg:justify-end">
            <div className="text-right">
              <div className="font-serif text-3xl">{course.credits}</div>
              <div className="text-xs text-muted-foreground">cr</div>
            </div>
            <div className="w-28">
              <Input
                aria-label={`${course.code} CGPA`}
                inputMode="decimal"
                value={grade}
                onChange={(event) => onGradeChange(course.id, event.target.value)}
                placeholder="CGPA"
                className="h-9 text-center"
              />
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label={`Remove ${course.code}`}>
              <X className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function categoryForCourse(course: Course & { groupTitle?: string }) {
  if (course.groupTitle?.includes("Language")) return "Language";
  if (course.groupTitle?.includes("General")) return "General Education";
  if (course.groupTitle?.includes("Mathematics")) return "Mathematics";
  if (course.groupTitle?.includes("Elective")) return course.area ?? "Elective";
  if (course.groupTitle?.includes("Basic Sciences")) return "Basic Sciences";
  if (course.groupTitle?.includes("Other Engineering")) return "Other Engineering";
  if (course.groupTitle?.includes("Final Year")) return "Final Year Project";
  if (course.groupTitle?.includes("University")) return "University Required";
  return "Core Course";
}

function categoryDot(category: string) {
  if (category === "Language") return "bg-sky-400";
  if (category === "General Education") return "bg-violet-400";
  if (category === "Mathematics") return "bg-amber-400";
  if (category === "Core Course") return "bg-blue-600";
  if (category === "Data Science") return "bg-emerald-500";
  if (category === "Software Engineering") return "bg-rose-500";
  return "bg-slate-400";
}

function categoryBar(category: string) {
  if (category === "Language") return "bg-sky-400";
  if (category === "General Education") return "bg-violet-400";
  if (category === "Mathematics") return "bg-amber-400";
  if (category === "Core Course") return "bg-blue-600";
  if (category === "Data Science") return "bg-emerald-500";
  if (category === "Software Engineering") return "bg-rose-500";
  return "bg-slate-400";
}
