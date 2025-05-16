import React, { useEffect, useState } from "react";
import caxios from "../../api/caxios";
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { Virtuoso } from "react-virtuoso";
import textFilter from "../../utils/textFilter";
import useLocationStore from "../../store/useLocationStore";
import usePlaceStore from "../../store/usePlaceStore";
import SearchIcon from "@mui/icons-material/Search";

const Step2Place = () => {
  const [query, setQuery] = useState("");
  const [filteredResults, setFilteredResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [placeList, setPlaceList] = useState([]);
  const [filter, setFilter] = useState(null);

  const { tripDate, startingPoint, startingLocation } = useLocationStore();
  const { selectedPlaces, addPlace, removePlace } = usePlaceStore();

  useEffect(() => {
    console.log("📦 tripDate:", tripDate);
    console.log("📦 startingLocation:", startingLocation);

    if (!startingLocation) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await caxios.post("/api/getList", {
          date: tripDate, // null/빈 값도 백엔드에서 처리
          startingLocation,
        });

        if (res.data.error) {
          alert(res.data.error);
          return;
        }

        const getList = res.data.results || [];
        setPlaceList(getList);
        setFilteredResults(getList);
      } catch (err) {
        console.error("장소 추천 리스트 불러오기 실패:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tripDate, startingLocation]);

  const handleSearch = async () => {
    setFilteredResults("");
    if (textFilter.isAbusiveOnlyInput(query)) {
      alert("부적절한 단어만 입력되어 요청을 처리할 수 없습니다.");
      setQuery("");
      return;
    }

    setLoading(true);
    try {
      const res = await caxios.post("/api/llm-recommend", {
        userInput: query,
        examplePlaces: placeList,
      });

      if (res.data.error) {
        alert(res.data.error);
        return;
      }

      setFilteredResults(res.data.results || []);
      setQuery("");
    } catch (err) {
      console.error("LLM 요청 실패:", err);
      alert("추천 요청 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const getRandomSubset = (arr, count) =>
    [...arr].sort(() => 0.5 - Math.random()).slice(0, count);

  const keywordList = ["맛집", "관광지", "쇼핑"];

  return (
    <Box sx={{ height: "100vh" }}>
      <Typography>{tripDate}</Typography>
      <Typography>{startingPoint}</Typography>

      <Typography variant="h6" gutterBottom>
        추천 장소 검색
      </Typography>

      {/* 🔘 필터 버튼 */}
      <Box sx={{ mb: 2, display: "flex", flexWrap: "wrap", gap: 1 }}>
        {keywordList.map((kw) => (
          <Button
            key={kw}
            variant={filter === kw ? "contained" : "outlined"}
            size="small"
            onClick={() => {
              if (filter === kw) {
                setFilter(null);
                setFilteredResults(placeList);
              } else {
                const filtered = placeList.filter(
                  (p) => p.type === kw || p.category === kw
                );
                setFilter(kw);
                setFilteredResults(filtered);
              }
            }}
          >
            {kw}
          </Button>
        ))}

        <Button
          variant={filter === "오늘" ? "contained" : "outlined"}
          color="secondary"
          size="small"
          onClick={() => {
            if (filter === "오늘") {
              setFilter(null);
              setFilteredResults(placeList);
            } else {
              const recommended = getRandomSubset(placeList, 7);
              setFilter("오늘");
              setFilteredResults(recommended);
            }
          }}
        >
          오늘의 추천
        </Button>
      </Box>

      {/* 🔍 검색창 */}
      <TextField
        fullWidth
        placeholder="자연어로 장소를 입력해보세요 (예: 조용한 실내 박물관)"
        name="searchPlace"
        multiline
        rows={1}
        variant="outlined"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={handleSearch}>
                <SearchIcon />
              </IconButton>
            </InputAdornment>
          ),
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSearch();
          }
        }}
        sx={{ mb: 2 }}
      />

      {/* 📋 리스트 출력 */}
      {loading ? (
        <Box display="flex" justifyContent="center" sx={{ mt: 2, mb: 2 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ height: 700 }}>
          <Virtuoso
            data={filteredResults}
            itemContent={(index, place) => {
              const isAdded = selectedPlaces.some((p) => p.name === place.name);
              const togglePlace = () =>
                isAdded ? removePlace(place.name) : addPlace(place);

              const combinedText = `${place.description} ${place.reason}`;
              const imageSrc =
                place.imageUrl && place.imageUrl !== "null"
                  ? place.imageUrl
                  : "/images/NoImage.png";

              return (
                <Box
                  key={index}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid #eee",
                    px: 2,
                    py: 1.5,
                  }}
                >
                  <Box mr={2}>
                    <img
                      src={imageSrc}
                      alt={place.name}
                      style={{
                        width: 64,
                        height: 64,
                        objectFit: "cover",
                        borderRadius: 6,
                      }}
                    />
                  </Box>

                  <Box flex="1">
                    <Typography variant="subtitle1" fontWeight="bold">
                      {place.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {place.type} · {place.region}
                    </Typography>
                    <Typography variant="body2" mt={0.5}>
                      {combinedText}
                    </Typography>
                  </Box>

                  <Button
                    variant={isAdded ? "contained" : "outlined"}
                    size="small"
                    onClick={togglePlace}
                  >
                    {isAdded ? "✓ 선택됨" : "+"}
                  </Button>
                </Box>
              );
            }}
          />
        </Box>
      )}
    </Box>
  );
};

export default Step2Place;
