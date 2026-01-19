// Data types for the learning system
export var DocType;
(function (DocType) {
    DocType["TEXTBOOK"] = "textbook";
    DocType["NOTE"] = "note";
    DocType["WRONG_PROBLEM"] = "wrong_problem";
    DocType["EXAM_PAPER"] = "exam_paper";
    DocType["COURSEWARE"] = "\u5B66\u4E60\u5B8C\u6210\u7684\u8BFE\u4EF6";
    DocType["KNOWLEDGE_CARD"] = "\u77E5\u8BC6\u5361\u7247";
    DocType["MOCK_EXAM"] = "\u6A21\u62DF\u8003\u8BD5";
    DocType["HOMEWORK"] = "\u4F5C\u4E1A";
    DocType["TUTOR_SESSION"] = "\u8F85\u5BFC\u8BB0\u5F55";
    DocType["UNKNOWN"] = "unknown";
})(DocType || (DocType = {}));
export var KnowledgeStatus;
(function (KnowledgeStatus) {
    KnowledgeStatus["MASTERED"] = "\u5DF2\u7ECF\u638C\u63E1\u7684\u77E5\u8BC6";
    KnowledgeStatus["UNMASTERED"] = "\u672A\u638C\u63E1\u7684\u77E5\u8BC6";
    KnowledgeStatus["STRENGTHEN"] = "\u9700\u52A0\u5F3A\u7684\u77E5\u8BC6\u70B9";
})(KnowledgeStatus || (KnowledgeStatus = {}));
export var ProcessingStatus;
(function (ProcessingStatus) {
    ProcessingStatus["IDLE"] = "idle";
    ProcessingStatus["SCANNING"] = "scanning";
    ProcessingStatus["PROCESSED"] = "processed";
    ProcessingStatus["ERROR"] = "error";
    ProcessingStatus["INDEXING"] = "indexing";
    ProcessingStatus["ARCHIVED"] = "archived";
})(ProcessingStatus || (ProcessingStatus = {}));
export var ProblemStatus;
(function (ProblemStatus) {
    ProblemStatus["CORRECT"] = "correct";
    ProblemStatus["WRONG"] = "wrong";
    ProblemStatus["CORRECTED"] = "corrected"; // 订正过的
})(ProblemStatus || (ProblemStatus = {}));
export var IndexStatus;
(function (IndexStatus) {
    IndexStatus["PENDING"] = "pending";
    IndexStatus["INDEXING"] = "indexing";
    IndexStatus["INDEXED"] = "indexed";
    IndexStatus["FAILED"] = "failed";
})(IndexStatus || (IndexStatus = {}));
