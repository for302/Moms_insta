import { useState } from "react";
import { useKeywordStore } from "@/stores/keywordStore";
import { X, BookOpen, ExternalLink, ChevronDown, ChevronUp, FileText, Globe, Newspaper, GraduationCap } from "lucide-react";

interface ResearchListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ResearchListModal({ isOpen, onClose }: ResearchListModalProps) {
  const { researchHistory } = useKeywordStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* 모달 */}
      <div className="relative bg-white rounded-xl shadow-2xl w-[800px] max-h-[85vh] flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800">자료조사 전체 보기</h2>
            <span className="text-sm text-gray-500">({researchHistory.length}개)</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/50 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 내용 */}
        <div className="flex-1 overflow-y-auto p-6">
          {researchHistory.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              자료조사 기록이 없습니다
            </div>
          ) : (
            <div className="space-y-4">
              {researchHistory.map((item) => (
                <div
                  key={item.id}
                  className="border border-gray-200 rounded-xl overflow-hidden"
                >
                  {/* 요약 헤더 */}
                  <div
                    className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => toggleExpand(item.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 mb-1">{item.title}</h3>
                        <p className="text-sm text-gray-600">{item.summary}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                          {item.fullReport.papers.length > 0 && (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded">논문 {item.fullReport.papers.length}</span>
                          )}
                          {item.fullReport.conferences?.length > 0 && (
                            <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded">학회 {item.fullReport.conferences.length}</span>
                          )}
                          {item.fullReport.webResults?.length > 0 && (
                            <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded">웹 {item.fullReport.webResults.length}</span>
                          )}
                          {item.fullReport.news?.length > 0 && (
                            <span className="px-2 py-0.5 bg-orange-50 text-orange-600 rounded">뉴스 {item.fullReport.news.length}</span>
                          )}
                          {item.fullReport.ingredientAnalysis && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                              EWG {item.fullReport.ingredientAnalysis.ewgScore ?? "N/A"}
                            </span>
                          )}
                          <span className="text-gray-400">
                            {new Date(item.createdAt).toLocaleDateString("ko-KR")}
                          </span>
                        </div>
                      </div>
                      <button className="p-2">
                        {expandedId === item.id ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 상세 내용 */}
                  {expandedId === item.id && (
                    <div className="p-4 border-t border-gray-200 space-y-4">
                      {/* 주제 분석 */}
                      {item.fullReport.ingredientAnalysis && (
                        <div className="bg-blue-50 rounded-lg p-4">
                          <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            주제 분석
                          </h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">성분명: </span>
                              <span className="text-gray-600">
                                {item.fullReport.ingredientAnalysis.koreanName} (
                                {item.fullReport.ingredientAnalysis.ingredientName})
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">EWG 등급: </span>
                              <span className="text-green-600 font-semibold">
                                {item.fullReport.ingredientAnalysis.ewgScore ?? "N/A"}
                              </span>
                            </div>
                            {item.fullReport.ingredientAnalysis.recommendedConcentration && (
                              <div className="col-span-2">
                                <span className="font-medium text-gray-700">권장 농도: </span>
                                <span className="text-gray-600">
                                  {item.fullReport.ingredientAnalysis.recommendedConcentration}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* 효능 */}
                          <div className="mt-3">
                            <span className="font-medium text-gray-700">효능: </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.fullReport.ingredientAnalysis.benefits.map((benefit, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded"
                                >
                                  {benefit}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* 주의사항 */}
                          {item.fullReport.ingredientAnalysis.cautions.length > 0 && (
                            <div className="mt-3">
                              <span className="font-medium text-gray-700">주의사항: </span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.fullReport.ingredientAnalysis.cautions.map((caution, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded"
                                  >
                                    {caution}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 논문 목록 */}
                      {item.fullReport.papers.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-blue-600" />
                            논문 ({item.fullReport.papers.length}개)
                          </h4>
                          <div className="space-y-2">
                            {item.fullReport.papers.map((paper) => (
                              <div
                                key={paper.id}
                                className="p-3 bg-blue-50/50 rounded-lg border border-blue-100"
                              >
                                <div className="font-medium text-gray-800 text-sm mb-1">
                                  {paper.title}
                                </div>
                                <div className="text-xs text-gray-500 mb-1">
                                  {paper.authors.join(", ")} ({paper.publicationDate})
                                </div>
                                <div className="text-xs text-gray-500 mb-2">
                                  {paper.source}
                                  {paper.citationCount && ` · 인용 ${paper.citationCount}회`}
                                </div>
                                {paper.abstract && (
                                  <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                                    {paper.abstract}
                                  </p>
                                )}
                                {paper.url && (
                                  <a
                                    href={paper.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                  >
                                    보기 <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 학회 목록 */}
                      {item.fullReport.conferences && item.fullReport.conferences.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-purple-600" />
                            학회 ({item.fullReport.conferences.length}개)
                          </h4>
                          <div className="space-y-2">
                            {item.fullReport.conferences.map((conf) => (
                              <div
                                key={conf.id}
                                className="p-3 bg-purple-50/50 rounded-lg border border-purple-100"
                              >
                                <div className="font-medium text-gray-800 text-sm mb-1">
                                  {conf.title}
                                </div>
                                <div className="text-xs text-gray-500 mb-1">
                                  {conf.authors.join(", ")} ({conf.publishedDate})
                                </div>
                                <div className="text-xs text-gray-500 mb-2">
                                  {conf.source}
                                </div>
                                {conf.url && (
                                  <a
                                    href={conf.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-purple-600 hover:underline flex items-center gap-1"
                                  >
                                    보기 <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 웹 검색 결과 */}
                      {item.fullReport.webResults && item.fullReport.webResults.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                            <Globe className="w-4 h-4 text-green-600" />
                            웹 검색 ({item.fullReport.webResults.length}개)
                          </h4>
                          <div className="space-y-2">
                            {item.fullReport.webResults.map((web, idx) => (
                              <div
                                key={idx}
                                className="p-3 bg-green-50/50 rounded-lg border border-green-100"
                              >
                                <a
                                  href={web.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium text-gray-800 text-sm mb-1 hover:text-green-600 flex items-center gap-1"
                                >
                                  {web.title}
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                                <p className="text-xs text-gray-600 mt-1">
                                  {web.snippet}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 뉴스 목록 */}
                      {item.fullReport.news && item.fullReport.news.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                            <Newspaper className="w-4 h-4 text-orange-600" />
                            뉴스 ({item.fullReport.news.length}개)
                          </h4>
                          <div className="space-y-2">
                            {item.fullReport.news.map((news, idx) => (
                              <div
                                key={idx}
                                className="p-3 bg-orange-50/50 rounded-lg border border-orange-100"
                              >
                                <a
                                  href={news.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium text-gray-800 text-sm mb-1 hover:text-orange-600 flex items-center gap-1"
                                >
                                  {news.title}
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                                <div className="text-xs text-gray-500 mt-1">
                                  {news.source} · {news.pubDate}
                                </div>
                                {news.description && (
                                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                    {news.description}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
