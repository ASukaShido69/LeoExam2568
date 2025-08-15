import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format, isValid } from "date-fns";
import { th } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Plus,
  Edit,
  Trash2,
  Upload,
  Download,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import type { Question, Score, ExamSet } from "@/lib/types";

const categories = [
  "ความสามารถทั่วไป",
  "ภาษาไทย",
  "คอมพิวเตอร์ (เทคโนโลยีสารสนเทศ)",
  "ภาษาอังกฤษ",
  "สังคม วัฒนธรรม จริยธรรม และอาเซียน",
  "กฎหมายที่ประชาชนควรรู้",
];

const difficulties = ["ง่าย", "ปานกลาง", "ยาก"];

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState("questions");
  const [darkMode, setDarkMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [questionsPerPage] = useState(10);

  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editingExamSet, setEditingExamSet] = useState<ExamSet | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isExamSetDialogOpen, setIsExamSetDialogOpen] = useState(false);

  const [questionForm, setQuestionForm] = useState({
    questionText: "",
    options: ["", "", "", ""],
    correctAnswerIndex: 0,
    explanation: "",
    category: "",
    difficulty: "",
  });

  const [examSetForm, setExamSetForm] = useState({
    name: "",
    description: "",
    categoryDistribution: {} as Record<string, number>,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const setLocation = useLocation()[1];

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const { data: questions = [] } = useQuery<Question[]>({
    queryKey: ["/api/questions"],
    enabled: isLoggedIn,
  });

  const { data: scores = [] } = useQuery<Score[]>({
    queryKey: ["/api/scores"],
    enabled: isLoggedIn,
  });

  const { data: examSets = [] } = useQuery<ExamSet[]>({
    queryKey: ["/api/exam-sets"],
    enabled: isLoggedIn,
  });

  const { data: stats } = useQuery<{
    totalQuestions: number;
    totalExams: number;
    averageScore: number;
    averageTime: number;
  }>({
    queryKey: ["/api/admin/stats"],
    enabled: isLoggedIn,
  });

  // Pagination calculations
  const indexOfLastQuestion = currentPage * questionsPerPage;
  const indexOfFirstQuestion = indexOfLastQuestion - questionsPerPage;
  const currentQuestions = questions.slice(
    indexOfFirstQuestion,
    indexOfLastQuestion,
  );
  const totalPages = Math.ceil(questions.length / questionsPerPage);

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const response = await apiRequest(
        "POST",
        "/api/admin/login",
        credentials,
      );
      if (!response.ok) {
        throw new Error("Invalid credentials");
      }
      return response.json();
    },
    onSuccess: () => {
      setIsLoggedIn(true);
      toast({
        title: "เข้าสู่ระบบสำเร็จ",
        description: "ยินดีต้อนรับสู่ระบบจัดการข้อสอบ",
      });
    },
    onError: () => {
      toast({
        title: "เข้าสู่ระบบไม่สำเร็จ",
        description: "กรุณาตรวจสอบชื่อผู้ใช้และรหัสผ่าน",
        variant: "destructive",
      });
    },
  });

  const createQuestionMutation = useMutation({
    mutationFn: async (questionData: any) => {
      const response = await apiRequest("POST", "/api/questions", questionData);
      if (!response.ok) {
        throw new Error("Failed to create question");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      resetQuestionForm();
      setIsDialogOpen(false);
      toast({
        title: "สำเร็จ",
        description: "เพิ่มข้อสอบใหม่เรียบร้อยแล้ว",
      });
    },
    onError: () => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเพิ่มข้อสอบได้",
        variant: "destructive",
      });
    },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PUT", `/api/questions/${id}`, data);
      if (!response.ok) {
        throw new Error("Failed to update question");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
      resetQuestionForm();
      setIsDialogOpen(false);
      setEditingQuestion(null);
      toast({
        title: "สำเร็จ",
        description: "แก้ไขข้อสอบเรียบร้อยแล้ว",
      });
    },
    onError: () => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถแก้ไขข้อสอบได้",
        variant: "destructive",
      });
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/questions/${id}`);
      if (!response.ok) {
        throw new Error("Failed to delete question");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "สำเร็จ",
        description: "ลบข้อสอบเรียบร้อยแล้ว",
      });
    },
    onError: () => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบข้อสอบได้",
        variant: "destructive",
      });
    },
  });

  const createExamSetMutation = useMutation({
    mutationFn: async (examSetData: any) => {
      const response = await apiRequest("POST", "/api/exam-sets", examSetData);
      if (!response.ok) {
        throw new Error("Failed to create exam set");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exam-sets"] });
      resetExamSetForm();
      setIsExamSetDialogOpen(false);
      toast({
        title: "สำเร็จ",
        description: "เพิ่มชุดข้อสอบใหม่เรียบร้อยแล้ว",
      });
    },
    onError: () => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเพิ่มชุดข้อสอบได้",
        variant: "destructive",
      });
    },
  });

  const updateExamSetMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PUT", `/api/exam-sets/${id}`, data);
      if (!response.ok) {
        throw new Error("Failed to update exam set");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exam-sets"] });
      resetExamSetForm();
      setIsExamSetDialogOpen(false);
      setEditingExamSet(null);
      toast({
        title: "สำเร็จ",
        description: "แก้ไขชุดข้อสอบเรียบร้อยแล้ว",
      });
    },
    onError: () => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถแก้ไขชุดข้อสอบได้",
        variant: "destructive",
      });
    },
  });

  const deleteExamSetMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/exam-sets/${id}`);
      if (!response.ok) {
        throw new Error("Failed to delete exam set");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exam-sets"] });
      toast({
        title: "สำเร็จ",
        description: "ลบชุดข้อสอบเรียบร้อยแล้ว",
      });
    },
    onError: () => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบชุดข้อสอบได้",
        variant: "destructive",
      });
    },
  });

  const importCsvMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("csvFile", file);
      const response = await fetch("/api/import-csv", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error("Failed to import CSV");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "นำเข้าสำเร็จ",
        description: `นำเข้าข้อสอบจำนวน ${data.success} ข้อ`,
      });
    },
    onError: () => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถนำเข้าไฟล์ CSV ได้",
        variant: "destructive",
      });
    },
  });

  const handleLogin = () => {
    if (!username || !password) {
      toast({
        title: "กรุณากรอกข้อมูล",
        description: "โปรดกรอกชื่อผู้ใช้และรหัสผ่าน",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate({ username, password });
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem("adminLoggedIn");
    setLocation("/");
    toast({
      title: "ออกจากระบบสำเร็จ",
      description: "ขอบคุณที่ใช้บริการ",
    });
  };

  const resetQuestionForm = () => {
    setQuestionForm({
      questionText: "",
      options: ["", "", "", ""],
      correctAnswerIndex: 0,
      explanation: "",
      category: "",
      difficulty: "",
    });
  };

  const resetExamSetForm = () => {
    setExamSetForm({
      name: "",
      description: "",
      categoryDistribution: {},
    });
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    setQuestionForm({
      questionText: question.questionText,
      options: question.options,
      correctAnswerIndex: question.correctAnswerIndex,
      explanation: question.explanation,
      category: question.category,
      difficulty: question.difficulty,
    });
    setIsDialogOpen(true);
  };

  const handleEditExamSet = (examSet: ExamSet) => {
    setEditingExamSet(examSet);
    setExamSetForm({
      name: examSet.name,
      description: examSet.description,
      categoryDistribution: examSet.categoryDistribution,
    });
    setIsExamSetDialogOpen(true);
  };

  const handleSubmitQuestion = () => {
    if (
      !questionForm.questionText ||
      !questionForm.category ||
      !questionForm.difficulty
    ) {
      toast({
        title: "กรุณากรอกข้อมูลให้ครบถ้วน",
        description: "โปรดกรอกคำถาม หมวดวิชา และระดับความยาก",
        variant: "destructive",
      });
      return;
    }

    if (questionForm.options.some((option) => !option.trim())) {
      toast({
        title: "กรุณากรอกตัวเลือกให้ครบ",
        description: "โปรดกรอกตัวเลือกทั้ง 4 ข้อ",
        variant: "destructive",
      });
      return;
    }

    if (editingQuestion) {
      updateQuestionMutation.mutate({
        id: editingQuestion.id,
        data: questionForm,
      });
    } else {
      createQuestionMutation.mutate(questionForm);
    }
  };

  const handleSubmitExamSet = () => {
    if (!examSetForm.name) {
      toast({
        title: "กรุณากรอกชื่อชุดข้อสอบ",
        description: "โปรดกรอกชื่อชุดข้อสอบ",
        variant: "destructive",
      });
      return;
    }

    if (editingExamSet) {
      updateExamSetMutation.mutate({
        id: editingExamSet.id,
        data: examSetForm,
      });
    } else {
      createExamSetMutation.mutate(examSetForm);
    }
  };

  const handleDeleteQuestion = (id: string) => {
    if (confirm("คุณแน่ใจหรือไม่ที่จะลบข้อสอบนี้?")) {
      deleteQuestionMutation.mutate(id);
    }
  };

  const handleDeleteExamSet = (id: string) => {
    if (confirm("คุณแน่ใจหรือไม่ที่จะลบชุดข้อสอบนี้?")) {
      deleteExamSetMutation.mutate(id);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "text/csv") {
      importCsvMutation.mutate(file);
    } else {
      toast({
        title: "ไฟล์ไม่ถูกต้อง",
        description: "กรุณาเลือกไฟล์ CSV เท่านั้น",
        variant: "destructive",
      });
    }
  };

  const handleExportScores = async () => {
    try {
      const response = await fetch("/api/scores/export", {
        method: "POST",
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "exam_scores.csv";
        a.click();
        window.URL.revokeObjectURL(url);

        toast({
          title: "ส่งออกสำเร็จ",
          description: "ส่งออกข้อมูลคะแนนเรียบร้อยแล้ว",
        });
      }
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถส่งออกข้อมูลได้",
        variant: "destructive",
      });
    }
  };

  if (!isLoggedIn) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${darkMode ? "dark bg-gray-900" : "bg-gray-50"}`}
      >
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="text-center">เข้าสู่ระบบจัดการ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="username">ชื่อผู้ใช้</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="กรอกชื่อผู้ใช้"
              />
            </div>
            <div>
              <Label htmlFor="password">รหัสผ่าน</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="กรอกรหัสผ่าน"
                onKeyPress={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
            <Button
              onClick={handleLogin}
              className="w-full"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${darkMode ? "dark bg-gray-900 text-white" : "bg-gray-50"}`}
    >
      {/* Header */}
      <div
        className={`${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} border-b sticky top-0 z-50`}
      >
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">ระบบจัดการข้อสอบ</h1>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDarkMode(!darkMode)}
              >
                {darkMode ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                ออกจากระบบ
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">
                {stats?.totalQuestions || 0}
              </div>
              <p className="text-sm text-gray-600">ข้อสอบทั้งหมด</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {stats?.totalExams || 0}
              </div>
              <p className="text-sm text-gray-600">ครั้งที่ทำสอบ</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-purple-600">
                {stats?.averageScore || 0}%
              </div>
              <p className="text-sm text-gray-600">คะแนนเฉลี่ย</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-orange-600">
                {Math.floor((stats?.averageTime || 0) / 60)} นาที
              </div>
              <p className="text-sm text-gray-600">เวลาเฉลี่ย</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="questions">จัดการข้อสอบ</TabsTrigger>
            <TabsTrigger value="exam-sets">ชุดข้อสอบ</TabsTrigger>
            <TabsTrigger value="scores">ผลสอบ</TabsTrigger>
            <TabsTrigger value="import">นำเข้า/ส่งออก</TabsTrigger>
          </TabsList>

          {/* Questions Tab */}
          <TabsContent value="questions" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">จัดการข้อสอบ</h2>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => {
                      resetQuestionForm();
                      setEditingQuestion(null);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    เพิ่มข้อสอบใหม่
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingQuestion ? "แก้ไขข้อสอบ" : "เพิ่มข้อสอบใหม่"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="questionText">คำถาม</Label>
                      <Textarea
                        id="questionText"
                        value={questionForm.questionText}
                        onChange={(e) =>
                          setQuestionForm({
                            ...questionForm,
                            questionText: e.target.value,
                          })
                        }
                        placeholder="กรอกคำถาม"
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="category">หมวดวิชา</Label>
                        <Select
                          value={questionForm.category}
                          onValueChange={(value) =>
                            setQuestionForm({
                              ...questionForm,
                              category: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="เลือกหมวดวิชา" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="difficulty">ระดับความยาก</Label>
                        <Select
                          value={questionForm.difficulty}
                          onValueChange={(value) =>
                            setQuestionForm({
                              ...questionForm,
                              difficulty: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="เลือกระดับความยาก" />
                          </SelectTrigger>
                          <SelectContent>
                            {difficulties.map((difficulty) => (
                              <SelectItem key={difficulty} value={difficulty}>
                                {difficulty}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label>ตัวเลือก</Label>
                      {questionForm.options.map((option, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-3"
                        >
                          <div className="flex items-center">
                            <input
                              type="radio"
                              id={`option-${index}`}
                              name="correctAnswer"
                              checked={
                                questionForm.correctAnswerIndex === index
                              }
                              onChange={() =>
                                setQuestionForm({
                                  ...questionForm,
                                  correctAnswerIndex: index,
                                })
                              }
                              className="mr-2"
                            />
                            <Label htmlFor={`option-${index}`} className="w-8">
                              {["ก", "ข", "ค", "ง"][index]}
                            </Label>
                          </div>
                          <Input
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...questionForm.options];
                              newOptions[index] = e.target.value;
                              setQuestionForm({
                                ...questionForm,
                                options: newOptions,
                              });
                            }}
                            placeholder={`ตัวเลือก ${["ก", "ข", "ค", "ง"][index]}`}
                            className="flex-1"
                          />
                        </div>
                      ))}
                    </div>

                    <div>
                      <Label htmlFor="explanation">คำอธิบาย</Label>
                      <Textarea
                        id="explanation"
                        value={questionForm.explanation}
                        onChange={(e) =>
                          setQuestionForm({
                            ...questionForm,
                            explanation: e.target.value,
                          })
                        }
                        placeholder="กรอกคำอธิบาย"
                        rows={3}
                      />
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        ยกเลิก
                      </Button>
                      <Button
                        onClick={handleSubmitQuestion}
                        disabled={
                          createQuestionMutation.isPending ||
                          updateQuestionMutation.isPending
                        }
                      >
                        {createQuestionMutation.isPending ||
                        updateQuestionMutation.isPending
                          ? "กำลังบันทึก..."
                          : editingQuestion
                            ? "บันทึกการแก้ไข"
                            : "เพิ่มข้อสอบ"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Questions Table */}
            <Card>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">ลำดับ</TableHead>
                      <TableHead>คำถาม</TableHead>
                      <TableHead className="w-32">หมวดวิชา</TableHead>
                      <TableHead className="w-24">ระดับ</TableHead>
                      <TableHead className="w-32">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentQuestions.map((question, index) => (
                      <TableRow key={question.id}>
                        <TableCell>
                          {indexOfFirstQuestion + index + 1}
                        </TableCell>
                        <TableCell className="max-w-md">
                          <div
                            className="truncate"
                            title={question.questionText}
                          >
                            {question.questionText}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {question.category.length > 15
                              ? question.category.substring(0, 15) + "..."
                              : question.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              question.difficulty === "ง่าย"
                                ? "default"
                                : question.difficulty === "ปานกลาง"
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {question.difficulty}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditQuestion(question)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteQuestion(question.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex items-center justify-between space-x-2 py-4">
                  <div className="text-sm text-gray-500">
                    แสดง {indexOfFirstQuestion + 1}-
                    {Math.min(indexOfLastQuestion, questions.length)} จาก{" "}
                    {questions.length} ข้อ
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      ก่อนหน้า
                    </Button>
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(
                          (page) =>
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 2 &&
                              page <= currentPage + 2),
                        )
                        .map((page, index, array) => (
                          <div key={page}>
                            {index > 0 && array[index - 1] !== page - 1 && (
                              <span className="px-2">...</span>
                            )}
                            <Button
                              variant={
                                currentPage === page ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                            >
                              {page}
                            </Button>
                          </div>
                        ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                    >
                      ถัดไป
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Exam Sets Tab */}
          <TabsContent value="exam-sets" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">ชุดข้อสอบ</h2>
              <Dialog
                open={isExamSetDialogOpen}
                onOpenChange={setIsExamSetDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    onClick={() => {
                      resetExamSetForm();
                      setEditingExamSet(null);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    เพิ่มชุดข้อสอบใหม่
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingExamSet ? "แก้ไขชุดข้อสอบ" : "เพิ่มชุดข้อสอบใหม่"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="examSetName">ชื่อชุดข้อสอบ</Label>
                      <Input
                        id="examSetName"
                        value={examSetForm.name}
                        onChange={(e) =>
                          setExamSetForm({
                            ...examSetForm,
                            name: e.target.value,
                          })
                        }
                        placeholder="กรอกชื่อชุดข้อสอบ"
                      />
                    </div>

                    <div>
                      <Label htmlFor="examSetDescription">คำอธิบาย</Label>
                      <Textarea
                        id="examSetDescription"
                        value={examSetForm.description}
                        onChange={(e) =>
                          setExamSetForm({
                            ...examSetForm,
                            description: e.target.value,
                          })
                        }
                        placeholder="กรอกคำอธิบายชุดข้อสอบ"
                      />
                    </div>

                    <div>
                      <Label>การกระจายข้อสอบตามหมวดวิชา</Label>
                      <div className="space-y-3 mt-2">
                        {categories.map((category) => (
                          <div
                            key={category}
                            className="flex items-center justify-between"
                          >
                            <span className="text-sm font-medium">
                              {category}
                            </span>
                            <Input
                              type="number"
                              min="0"
                              max="50"
                              className="w-20"
                              value={
                                examSetForm.categoryDistribution[category] || 0
                              }
                              onChange={(e) =>
                                setExamSetForm({
                                  ...examSetForm,
                                  categoryDistribution: {
                                    ...examSetForm.categoryDistribution,
                                    [category]: parseInt(e.target.value) || 0,
                                  },
                                })
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsExamSetDialogOpen(false)}
                      >
                        ยกเลิก
                      </Button>
                      <Button
                        onClick={handleSubmitExamSet}
                        disabled={
                          createExamSetMutation.isPending ||
                          updateExamSetMutation.isPending
                        }
                      >
                        {createExamSetMutation.isPending ||
                        updateExamSetMutation.isPending
                          ? "กำลังบันทึก..."
                          : editingExamSet
                            ? "บันทึกการแก้ไข"
                            : "เพิ่มชุดข้อสอบ"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ชื่อชุดข้อสอบ</TableHead>
                      <TableHead>คำอธิบาย</TableHead>
                      <TableHead>จำนวนข้อสอบ</TableHead>
                      <TableHead className="w-32">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {examSets.map((examSet) => (
                      <TableRow key={examSet.id}>
                        <TableCell className="font-medium">
                          {examSet.name}
                        </TableCell>
                        <TableCell>{examSet.description}</TableCell>
                        <TableCell>
                          {Object.values(examSet.categoryDistribution).reduce(
                            (sum, count) => sum + count,
                            0,
                          )}{" "}
                          ข้อ
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditExamSet(examSet)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteExamSet(examSet.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Scores Tab */}
          <TabsContent value="scores" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">ผลสอบ</h2>
              <Button onClick={handleExportScores}>
                <Download className="h-4 w-4 mr-2" />
                ส่งออก CSV
              </Button>
            </div>

            <Card>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>วันที่</TableHead>
                      <TableHead>ประเภทการสอบ</TableHead>
                      <TableHead>คะแนน</TableHead>
                      <TableHead>ตอบถูก/ทั้งหมด</TableHead>
                      <TableHead>เวลาที่ใช้</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scores.map((score) => (
                      <TableRow key={score.id}>
                        <TableCell>
                          {score.dateTaken &&
                          !isNaN(new Date(score.dateTaken).getTime())
                            ? new Date(score.dateTaken).toLocaleDateString(
                                "th-TH",
                              )
                            : "-"}
                        </TableCell>
                        <TableCell>{score.examType}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              score.totalScore >= 80
                                ? "default"
                                : score.totalScore >= 60
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {score.totalScore}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {score.correctAnswers}/{score.totalQuestions}
                        </TableCell>
                        <TableCell>
                          {Math.floor(score.timeSpent / 60)} นาที{" "}
                          {score.timeSpent % 60} วินาที
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Import/Export Tab */}
          <TabsContent value="import" className="space-y-4">
            <h2 className="text-xl font-semibold">นำเข้า/ส่งออกข้อมูล</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>นำเข้าข้อสอบ (CSV)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">
                    อัพโหลดไฟล์ CSV ที่มีคอลัมน์: วิชา, คำถาม, ตัวเลือก ก,
                    ตัวเลือก ข, ตัวเลือก ค, ตัวเลือก ง, คำตอบที่ถูก (a/b/c/d),
                    คำอธิบาย
                  </p>
                  <div>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="csv-upload"
                    />
                    <Button asChild>
                      <label htmlFor="csv-upload" className="cursor-pointer">
                        <Upload className="h-4 w-4 mr-2" />
                        เลือกไฟล์ CSV
                      </label>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>ส่งออกผลสอบ</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">
                    ส่งออกข้อมูลผลสอบทั้งหมดเป็นไฟล์ CSV
                  </p>
                  <Button onClick={handleExportScores}>
                    <Download className="h-4 w-4 mr-2" />
                    ส่งออกผลสอบ
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
