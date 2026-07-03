import os
import glob

def generate_file_list(data_folder="data"):
    """
    data 폴더 내의 data_*.js 파일 목록을 스캔하여 file_list.js로 저장하는 함수
    """
    # 1. data 폴더가 없으면 생성 (에러 방지)
    if not os.path.exists(data_folder):
        os.makedirs(data_folder)
        print(f"📁 '{data_folder}' 폴더가 생성되었습니다.")

    # 2. data_*.js 패턴에 맞는 파일들만 스캔
    search_pattern = os.path.join(data_folder, "data_*.js")
    
    # 경로를 제외하고 순수 파일명만 추출
    js_files = [os.path.basename(f) for f in glob.glob(search_pattern)]
    
    # 3. 자바스크립트 배열 문자열로 포맷팅
    if js_files:
        # 파일명들을 큰따옴표와 쉼표로 연결
        array_content = '", "'.join(js_files)
        js_output = f'const quizFileList = ["{array_content}"];\n'
    else:
        # 파일이 없을 경우 빈 배열
        js_output = 'const quizFileList = [];\n'

    # 4. file_list.js 파일 생성 및 저장
    output_path = os.path.join(data_folder, "file_list.js")
    
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(js_output)
        
    print(f"✅ 출석부 생성 완료: '{output_path}' (총 {len(js_files)}개의 파일이 등록되었습니다.)")

# --- 실행 부분 ---
# 데이터 전처리 프로그램의 모든 파일 저장 작업이 끝난 후 맨 마지막에 호출하세요.
if __name__ == "__main__":
    # js 파일들이 모여있는 폴더명을 인자로 넣습니다. (기본값: "data")
    generate_file_list("data")