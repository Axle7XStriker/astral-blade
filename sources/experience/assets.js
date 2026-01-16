/** Contains a list of assets that the experience leverages. */
export default [
    {
        name: "base",
        data: {},
        items: [{ name: "lennaTexture", source: import.meta.env.BASE_URL + "assets/lenna.png", type: "texture" }],
    },
    {
        name: "HUD",
        data: {},
        items: [
            { name: "hudBoundary", source: import.meta.env.BASE_URL + "/assets/hud-boundary.svg", type: "vector-graphic" },
            { name: "feedbackIcon", source: import.meta.env.BASE_URL + "/assets/feedback-icon.svg", type: "vector-graphic" },
            { name: "backIndicator", source: import.meta.env.BASE_URL + "/assets/back-indicator.svg", type: "vector-graphic" },
        ],
    },
    {
        name: "SelfPics",
        data: {},
        items: [{ name: "myFace", source: import.meta.env.BASE_URL + "/assets/ab_face.png", type: "texture" }],
    },
    {
        name: "MusicIllustrations",
        data: {},
        items: [
            {
                name: "listening",
                source: import.meta.env.BASE_URL + "/assets/listening-happy-music-rafiki.svg",
                type: "vector-graphic",
            },
            {
                name: "singing",
                source: import.meta.env.BASE_URL + "/assets/friends-singing-christmas-carol-amico.svg",
                type: "vector-graphic",
            },
            {
                name: "composing",
                source: import.meta.env.BASE_URL + "/assets/compose-music-pana.svg",
                type: "vector-graphic",
            },
        ],
    },
    {
        name: "FitnessIllustrations",
        data: {},
        items: [
            {
                name: "jogging",
                source: import.meta.env.BASE_URL + "/assets/jogging-rafiki.svg",
                type: "vector-graphic",
            },
            {
                name: "workout",
                source: import.meta.env.BASE_URL + "/assets/workout-cuate.svg",
                type: "vector-graphic",
            },
            {
                name: "football",
                source: import.meta.env.BASE_URL + "/assets/football-goal-bro.svg",
                type: "vector-graphic",
            },
        ],
    },
    {
        name: "FunActivites",
        data: {},
        items: [
            { name: "travelCar", source: import.meta.env.BASE_URL + "/assets/shelbygtr/scene.gltf", type: "3d-model" },
        ],
    }
];
